'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateCampaignStrategy, generatePostVariants, generateCreativeBriefs } from '@/lib/ai/prompts';

export async function getCampaigns() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
  return data || [];
}

export async function getCampaignById(id: string) {
  const supabase = createAdminClient();
  
  const [campaignRes, variantsRes, briefsRes] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase.from('post_variants').select('*').eq('campaign_id', id).order('created_at', { ascending: true }),
    supabase.from('creative_briefs').select('*').eq('campaign_id', id).order('created_at', { ascending: true })
  ]);

  if (campaignRes.error) return null;

  return {
    ...campaignRes.data,
    variants: variantsRes.data || [],
    briefs: briefsRes.data || [],
  };
}

export async function createCampaignWizard(formData: FormData) {
  const prompt = formData.get('prompt') as string;
  const audience = formData.get('audience') as string;
  const objective = formData.get('objective') as string;
  const product = formData.get('product') as string;
  const tone = formData.get('tone') as string;

  const supabase = createAdminClient();

  // 1. Create base campaign record
  const { data: campaign, error: insertError } = await supabase.from('campaigns').insert({
    name: prompt.substring(0, 50) + '...',
    objective,
    audience,
    product,
    tone,
    status: 'Generating',
  }).select().single();

  if (insertError || !campaign) {
    throw new Error('Failed to create campaign record');
  }

  // Next steps will be run asynchronously or directly if we want to block (we block for simplicity in Phase 3)
  // In a production app with Vercel, server actions can timeout if they take >15s. We'll wait here for now.
  
  try {
    // 2. Generate Strategy
    const strategy = await generateCampaignStrategy(campaign.id, { prompt, audience, objective, product });
    
    await supabase.from('campaigns').update({
      strategy: strategy as any,
      brief: strategy.content_strategy,
      status: 'Generating Variants',
    }).eq('id', campaign.id);

    // 3. Generate Posts
    const postsResult = await generatePostVariants(campaign.id, strategy);
    
    if (postsResult.variants.length > 0) {
      const postsToInsert = postsResult.variants.map((v) => ({
        campaign_id: campaign.id,
        hook: v.hook,
        body: v.body,
        cta: v.cta,
        audience: v.audience,
        angle: v.angle,
        status: 'Draft',
      }));
      const { error: insertPostsError } = await supabase.from('post_variants').insert(postsToInsert);
      if (insertPostsError) {
        console.error('Error inserting post variants:', insertPostsError);
      }
    }

    // 4. Generate Briefs
    const briefsResult = await generateCreativeBriefs(campaign.id, strategy);
    
    if (briefsResult.briefs.length > 0) {
      const briefsToInsert = briefsResult.briefs.map((b) => ({
        campaign_id: campaign.id,
        visual_concept: b.visual_concept,
        product_focus: b.product_focus,
        target_audience: b.target_audience,
        setting: b.setting,
        composition: b.composition,
        image_prompt: b.image_prompt,
      }));
      await supabase.from('creative_briefs').insert(briefsToInsert);
    }

    // 5. Finalize
    await supabase.from('campaigns').update({ status: 'Ready' }).eq('id', campaign.id);

  } catch (error) {
    console.error('Wizard AI generation error:', error);
    await supabase.from('campaigns').update({ status: 'Draft' }).eq('id', campaign.id);
    throw error;
  }

  revalidatePath('/campaigns');
  redirect(`/campaigns/${campaign.id}`);
}
