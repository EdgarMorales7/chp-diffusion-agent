'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server';
import { imageProvider, estimateGenerationCost, resolveModelDimensions, getImageCapabilities } from '@/lib/ai/imageProvider';
import { revalidatePath } from 'next/cache';

/**
 * Builds the final prompt combining brief data, product fidelity, and brand rules without hallucinating details.
 */
function buildImagePrompt(brief: any, brandTone: string = 'natural, commercial studio'): string {
  const base = brief.image_prompt || brief.visual_concept;
  const product = (brief.product_focus || '').toLowerCase();
  const customization = (brief.customization || '').toLowerCase();

  // Enforce product fidelity according to CHP garments
  let garmentClarification = 'Apparel product photography';
  if (product.includes('playera') || product.includes('t-shirt') || product.includes('remera')) {
    garmentClarification = 'High quality cotton crewneck t-shirt (playera básica), realistic fabric drape, clean collar seam';
  } else if (product.includes('sudadera') || product.includes('hoodie')) {
    garmentClarification = 'Comfortable fleece hoodie / sweatshirt (sudadera), ribbed cuffs and hem, premium textile texture';
  } else if (product.includes('polo')) {
    garmentClarification = 'Piqué knit polo shirt with structured collar and button placket, classic athletic-casual fit';
  }

  // Enforce customization technique realism
  let techniqueClarification = '';
  if (customization.includes('dtf') || base.toLowerCase().includes('dtf')) {
    techniqueClarification = 'Customization technique: DTF (Direct-to-Film transfer), clean crisp graphic edges, vibrant colors, semi-matte heat transfer finish directly on garment surface';
  } else if (customization.includes('dtg') || base.toLowerCase().includes('dtg')) {
    techniqueClarification = 'Customization technique: DTG (Direct-to-Garment), soft-touch water-based textile ink seamlessly absorbed into garment cotton fibers, breathable texture';
  } else if (customization.includes('bordado') || customization.includes('embroidery') || base.toLowerCase().includes('bordado')) {
    techniqueClarification = 'Customization technique: Premium machine embroidery, raised dimensional rayon thread stitching, visible satin and tatami stitches, realistic thread sheen and texture';
  }

  return `${base}.
Garment Details: ${garmentClarification}.
${techniqueClarification ? techniqueClarification + '.\n' : ''}Setting: ${brief.setting || 'Professional commercial photo studio or authentic business environment'}.
Composition: ${brief.composition || 'Centred product framing with focus on personalized apparel'}.
Audience Context: ${brief.target_audience || 'Entrepreneurs and local businesses'}.
Visual Direction: High resolution commercial photography, natural color balance, sharp depth of field, ${brandTone}. Do not include watermarks or irrelevant text.`;
}

/**
 * Returns generation preview info (provider, model, dimensions, estimated cost) for UX cost control before generation.
 */
export async function getGenerationPreflight(aspectRatio: string = '1:1') {
  const provider = imageProvider.config.provider || 'openai';
  const model = imageProvider.config.model || 'gpt-image-2.5-flare';
  const size = resolveModelDimensions(provider, model, aspectRatio);
  const cost = estimateGenerationCost(provider, model, size);
  const caps = getImageCapabilities(provider, model);

  return {
    provider,
    model,
    size,
    aspectRatio,
    estimatedCost: cost.estimatedCost,
    costNote: cost.note,
    supportedAspectRatios: caps.supportedAspectRatios,
  };
}

/**
 * Generates an image and uploads it to private Supabase Storage.
 * Generates signed URLs for admin display to avoid exposing permanent public URLs.
 */
export async function generateCreative(
  campaignId: string, 
  briefId: string, 
  aspectRatio: string = '1:1', 
  quality: string = 'standard'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Fetch brief details directly
    const { data: brief, error: briefError } = await supabase
      .from('creative_briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (briefError || !brief) {
      console.error('[CreativeEngine] Creative brief no encontrado:', briefError);
      return { success: false, error: 'Creative brief no encontrado en la base de datos' };
    }

    // 2. Fetch campaign details directly
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('product, customization, tone')
      .eq('id', campaignId)
      .single();

    const brandTone = campaign?.tone || 'natural, professional commercial';
    const finalPrompt = buildImagePrompt(
      { ...brief, customization: campaign?.customization, product_focus: brief.product_focus || campaign?.product }, 
      brandTone
    );

    // 3. Generate image through provider abstraction (with automatic DALL-E 3 fallback)
    const result = await imageProvider.generateImage({
      prompt: finalPrompt,
      aspectRatio,
      quality,
    });

    const fileName = `campaigns/${campaignId}/creatives/${briefId}_${Date.now()}.png`;

    // 4. Upload to private Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('creatives')
      .upload(fileName, result.imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[CreativeEngine] Error al subir imagen a Supabase Storage:', uploadError);
      return { 
        success: false, 
        error: `Error en Storage (bucket "creatives"): ${uploadError.message}. Verifica que el bucket exista.` 
      };
    }

    // 5. Create time-limited signed URL for immediate preview (3600 seconds = 1 hour)
    const { data: signedData } = await supabase
      .storage
      .from('creatives')
      .createSignedUrl(fileName, 3600);

    const initialDisplayUrl = signedData?.signedUrl || result.imageUrl;

    // 6. Insert into creatives table with cost and usage tracking
    const { error: dbError } = await supabase.from('creatives').insert({
      campaign_id: campaignId,
      creative_brief_id: briefId,
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      image_url: initialDisplayUrl,
      storage_path: fileName,
      aspect_ratio: result.aspectRatio,
      size: result.requestedSize,
      requested_size: result.requestedSize,
      requested_quality: result.requestedQuality,
      estimated_cost: result.estimatedCost || 0,
      actual_usage: result.actualUsage,
      generation_cost: result.estimatedCost || 0,
      status: 'Pending Approval',
    });

    if (dbError) {
      console.error('[CreativeEngine] Error al registrar creativo en base de datos:', dbError);
      return { success: false, error: `Error en BD al guardar creativo: ${dbError.message}` };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath('/creatives');
    return { success: true };
  } catch (error: unknown) {
    console.error('[CreativeEngine] Error inesperado en generateCreative:', error);
    const message = error instanceof Error ? error.message : 'Error inesperado al generar la imagen';
    return { success: false, error: message };
  }
}

/**
 * Fetches all creatives and populates fresh signed URLs from private storage.
 */
export async function getCreatives() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('creatives')
    .select('*, campaigns(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching creatives:', error);
    return [];
  }

  // Resolve signed URLs for each creative from private storage
  const creativesWithSignedUrls = await Promise.all(
    (data || []).map(async (c: any) => {
      if (c.storage_path) {
        const { data: signed } = await supabase
          .storage
          .from('creatives')
          .createSignedUrl(c.storage_path, 3600);
        if (signed?.signedUrl) {
          return { ...c, image_url: signed.signedUrl };
        }
      }
      return c;
    })
  );

  return creativesWithSignedUrls;
}

/**
 * Fetches a single creative by ID and populates fresh signed URL.
 */
export async function getCreativeById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('creatives')
    .select('*, campaigns(*), creative_briefs(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching creative:', error);
    return null;
  }

  if (data.storage_path) {
    const { data: signed } = await supabase
      .storage
      .from('creatives')
      .createSignedUrl(data.storage_path, 3600);
    if (signed?.signedUrl) {
      data.image_url = signed.signedUrl;
    }
  }

  return data;
}

export async function linkCreativeToPost(creativeId: string, variantId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('post_creatives').insert({
    creative_id: creativeId,
    post_variant_id: variantId,
  });

  if (error) {
    console.error('Error linking post:', error);
    throw new Error('Failed to link creative to post');
  }

  revalidatePath(`/creatives/${creativeId}`);
}

export async function updateCreativeStatus(id: string, status: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('creatives').update({ status }).eq('id', id);

  if (error) {
    throw new Error('Failed to update creative status');
  }

  revalidatePath(`/creatives/${id}`);
  revalidatePath('/creatives');
}
