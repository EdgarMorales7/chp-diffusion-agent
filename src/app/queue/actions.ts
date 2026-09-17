'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkDuplicates, checkGroupAvailability, calculateMatchScore } from '@/lib/queue/matching';
import { ACTIONABLE_STATUSES, selectNextTask, getTodayRange, canTransition, QueueStatus } from '@/lib/queue/status';

export async function getQueueTasks(filters?: { status?: string; dateRange?: { start: string; end: string } }) {
  const supabase = createAdminClient();
  let query = supabase
    .from('publication_queue')
    .select('*, groups(*), campaigns(*), post_variants(*), creatives(*, creative_briefs(*))')
    .order('scheduled_for', { ascending: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.dateRange) {
    query = query.gte('scheduled_for', filters.dateRange.start).lte('scheduled_for', filters.dateRange.end);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching queue:', error);
    return [];
  }

  // Inject signed URLs for creatives
  const tasksWithImages = await Promise.all(
    (data || []).map(async (task: any) => {
      if (task.creatives?.storage_path) {
        const { data: signed } = await supabase.storage.from('creatives').createSignedUrl(task.creatives.storage_path, 3600);
        if (signed?.signedUrl) {
          task.creatives.image_url = signed.signedUrl;
        }
      }
      return task;
    })
  );

  return tasksWithImages;
}

export async function getQueueTaskById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('publication_queue')
    .select('*, groups(*), group_rules(*), campaigns(*), post_variants(*), creatives(*, creative_briefs(*))')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  if (data.creatives?.storage_path) {
    const { data: signed } = await supabase.storage.from('creatives').createSignedUrl(data.creatives.storage_path, 3600);
    if (signed?.signedUrl) {
      data.creatives.image_url = signed.signedUrl;
    }
  }

  return data;
}

export async function createQueueTask(payload: {
  groupId: string;
  campaignId: string;
  postVariantId: string;
  creativeId: string;
  scheduledFor: string;
  priority?: string;
  status?: string;
  force?: boolean; // bypass duplicate warnings
}) {
  const scheduledDate = new Date(payload.scheduledFor);

  // Validation
  const availability = await checkGroupAvailability(payload.groupId, scheduledDate);
  if (!availability.allowed && !payload.force) {
    return { error: true, warning: false, message: availability.reason };
  }

  const dupeCheck = await checkDuplicates(payload.groupId, payload.campaignId, payload.postVariantId, payload.creativeId, scheduledDate);
  if (dupeCheck.isDuplicate && !payload.force) {
    return { error: false, warning: true, message: dupeCheck.reason };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('publication_queue').insert({
    group_id: payload.groupId,
    campaign_id: payload.campaignId,
    post_variant_id: payload.postVariantId,
    creative_id: payload.creativeId,
    scheduled_for: payload.scheduledFor,
    priority: payload.priority || 'Medium',
    status: payload.status || 'Planned',
  }).select().single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error('Fallo al crear la tarea en la cola');
  }

  revalidatePath('/queue');
  revalidatePath('/queue/calendar');
  return { success: true, task: data };
}

export async function updateQueueTask(id: string, updates: any) {
  const supabase = createAdminClient();

  // If status is transitioning, validate through state machine
  if (updates.status) {
    const { data: current } = await supabase
      .from('publication_queue')
      .select('status')
      .eq('id', id)
      .single();

    if (current?.status && !canTransition(current.status as QueueStatus, updates.status as QueueStatus)) {
      console.warn(`Transición de estado no permitida: ${current.status} -> ${updates.status}`);
    }
  }

  const { error } = await supabase.from('publication_queue').update(updates).eq('id', id);

  if (error) throw new Error('Error updating task');

  revalidatePath('/queue');
  revalidatePath('/queue/calendar');
  revalidatePath(`/queue/prepare/${id}`);
}

/**
 * Explicit action to mark a task as prepared.
 * Records prepared_at timestamp and optionally transitions Draft/Planned to Ready.
 */
export async function markTaskAsPrepared(id: string) {
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from('publication_queue')
    .select('prepared_at, status')
    .eq('id', id)
    .single();

  const updates: any = {};
  if (!current?.prepared_at) {
    updates.prepared_at = new Date().toISOString();
  }
  if (current?.status === 'Draft' || current?.status === 'Planned') {
    updates.status = 'Ready';
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('publication_queue').update(updates).eq('id', id);
    if (error) throw new Error('Error al registrar preparación');
    revalidatePath('/queue');
    revalidatePath(`/queue/prepare/${id}`);
  }

  return { success: true };
}

/**
 * Explicit action to approve publication.
 * Sets status = 'Approved' and records approved_at timestamp.
 */
export async function approveQueueTask(id: string) {
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from('publication_queue')
    .select('approved_at')
    .eq('id', id)
    .single();

  const updates: any = {
    status: 'Approved',
    approved_at: current?.approved_at || new Date().toISOString(),
  };

  const { error } = await supabase.from('publication_queue').update(updates).eq('id', id);
  if (error) throw new Error('Error al aprobar publicación');

  revalidatePath('/queue');
  revalidatePath('/queue/calendar');
  revalidatePath(`/queue/prepare/${id}`);
  return { success: true };
}

/**
 * Internal audit tracking when user opens Facebook group.
 */
export async function recordGroupOpened(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('publication_queue')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error recording opened_at:', error);
  }
  return { success: true };
}

/**
 * Marks publication task as published atomically.
 */
export async function markTaskAsPublished(id: string, facebookUrl?: string, notes?: string) {
  const supabase = createAdminClient();
  const updates: any = {
    status: 'Published',
    published_at: new Date().toISOString(),
    facebook_post_url: facebookUrl?.trim() || null,
    publication_notes: notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('publication_queue')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error marking task as published:', error);
    throw new Error('Fallo al marcar la publicación como publicada');
  }

  revalidatePath('/queue');
  revalidatePath('/queue/calendar');
  revalidatePath(`/queue/prepare/${id}`);
  return { success: true, task: data };
}

/**
 * Explicit action to skip a publication task.
 */
export async function skipQueueTask(id: string, notes?: string) {
  const supabase = createAdminClient();
  const updates: any = {
    status: 'Skipped',
    skipped_at: new Date().toISOString(),
    publication_notes: notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('publication_queue')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error skipping task:', error);
    throw new Error('Fallo al omitir la tarea');
  }

  revalidatePath('/queue');
  revalidatePath('/queue/calendar');
  revalidatePath(`/queue/prepare/${id}`);
  return { success: true, task: data };
}

/**
 * Finds the next actionable publication task for today or earlier.
 * Strictly uses valid actionable statuses (Today, Approved, Ready, Planned).
 * Explicitly excludes terminal states (Published, Skipped, Cancelled) and Draft.
 * Sorts by real priority (High=3 > Medium=2 > Low=1) then scheduled_for ASC.
 */
export async function getNextTask(currentId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { end: todayEnd } = getTodayRange();

  const { data, error } = await supabase
    .from('publication_queue')
    .select('id, status, priority, scheduled_for')
    .in('status', ACTIONABLE_STATUSES as unknown as string[])
    .lte('scheduled_for', todayEnd.toISOString())
    .neq('id', currentId);

  if (error || !data || data.length === 0) return null;

  const next = selectNextTask(data, currentId, todayEnd);
  return next ? next.id : null;
}

/**
 * AI Suggestions: Generate proposed queue tasks for a campaign.
 * Does NOT insert into DB automatically. Returns proposals for UI review.
 */
export async function suggestQueueForCampaign(
  campaignId: string, 
  limit: number = 5
): Promise<{ success: boolean; proposals?: any[]; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Get campaign, posts, and creatives
    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
    
    // Allow all post variants in this campaign
    const { data: posts } = await supabase
      .from('post_variants')
      .select('*')
      .eq('campaign_id', campaignId);
    
    if (!posts || posts.length === 0) {
      return { success: false, error: 'Esta campaña no tiene textos publicitarios generados.' };
    }

    // Prioritize Approved creatives, otherwise fallback to any created creatives for this campaign
    let { data: creatives } = await supabase
      .from('creatives')
      .select('*, creative_briefs(*)')
      .eq('campaign_id', campaignId)
      .eq('status', 'Approved');

    if (!creatives || creatives.length === 0) {
      const fallback = await supabase
        .from('creatives')
        .select('*, creative_briefs(*)')
        .eq('campaign_id', campaignId);
      creatives = fallback.data || [];
    }

    if (!creatives || creatives.length === 0) {
      return { 
        success: false, 
        error: 'Aún no hay imágenes generadas para esta campaña. Por favor genera al menos una imagen en la sección de Creative Briefs.' 
      };
    }

    // 2. Get active groups
    const { data: groups } = await supabase.from('groups').select('*').eq('status', 'Active');
    if (!groups || groups.length === 0) {
      return { 
        success: false, 
        error: 'No hay grupos de Facebook con estado "Active". Ve a la sección de Grupos para registrar o activar tus grupos.' 
      };
    }

    // 3. Generate Matches
    const proposals = [];
    const now = new Date();
    let dayOffset = 1;

    for (const group of groups) {
      if (proposals.length >= limit) break;

      // Check rules
      const avail = await checkGroupAvailability(group.id, new Date(now.getTime() + dayOffset * 86400000));
      if (!avail.allowed) continue;

      // Find best match
      let bestMatch = null;
      let highestScore = -1;

      for (const post of posts) {
        for (const creative of creatives) {
          const match = calculateMatchScore(group, post, creative, campaign);
          if (match.score > highestScore) {
            highestScore = match.score;
            bestMatch = { post, creative, explanation: match.explanation };
          }
        }
      }

      if (bestMatch) {
        const scheduledDate = new Date(now);
        scheduledDate.setDate(now.getDate() + dayOffset);
        scheduledDate.setHours(10, 0, 0, 0); // 10:00 AM default

        proposals.push({
          groupId: group.id,
          groupName: group.name,
          campaignId,
          postVariantId: bestMatch.post.id,
          postBodyPreview: bestMatch.post.hook,
          creativeId: bestMatch.creative.id,
          creativePreview: bestMatch.creative.image_url,
          storagePath: bestMatch.creative.storage_path,
          scheduledFor: scheduledDate.toISOString(),
          score: highestScore,
          explanation: bestMatch.explanation,
          warning: avail.warning ? avail.reason : null,
        });

        dayOffset++; // Spread them across days
      }
    }

    // Resolve Signed URLs for proposals
    const proposalsWithImages = await Promise.all(
      proposals.map(async (p) => {
        if (p.storagePath) {
          const { data: signed } = await supabase.storage.from('creatives').createSignedUrl(p.storagePath, 3600);
          if (signed?.signedUrl) p.creativePreview = signed.signedUrl;
        }
        return p;
      })
    );

    return { 
      success: true, 
      proposals: proposalsWithImages.sort((a, b) => b.score - a.score) 
    };
  } catch (error: unknown) {
    console.error('[QueueActions] Error en suggestQueueForCampaign:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al generar sugerencias de cola';
    return { success: false, error: msg };
  }
}
