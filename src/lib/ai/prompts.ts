import { z } from 'zod';
import { ai } from './provider';
import { getChpKnowledgeContext } from './contextBuilder';

// Zod schemas para output estructurado
export const CampaignStrategySchema = z.object({
  objective: z.string(),
  target_audience: z.string(),
  core_offer: z.string(),
  main_value_proposition: z.string(),
  communication_angles: z.array(z.string()),
  recommended_cta: z.string(),
  recommended_tone: z.string(),
  content_strategy: z.string(),
});

export const PostVariantsSchema = z.object({
  variants: z.array(z.object({
    hook: z.string(),
    body: z.string(),
    cta: z.string(),
    tone: z.string(),
    angle: z.string(),
    audience: z.string(),
    explanation: z.string(), // ¿Por qué esta variante?
  })).min(1),
});

export const CreativeBriefsSchema = z.object({
  briefs: z.array(z.object({
    visual_concept: z.string(),
    product_focus: z.string(),
    target_audience: z.string(),
    setting: z.string(),
    composition: z.string(),
    image_prompt: z.string(),
  }))
});

export async function generateCampaignStrategy(campaignId: string, input: { prompt: string; audience?: string; objective?: string; product?: string }) {
  const context = await getChpKnowledgeContext();
  const systemPrompt = `Eres un estratega de marketing de contenido experto para la marca CHP Personalizados.
Tu objetivo es crear una estrategia clara y accionable.
${context}
`;

  const userPrompt = `
Idea del usuario: "${input.prompt}"
Audiencia sugerida: ${input.audience || 'Proponer'}
Objetivo sugerido: ${input.objective || 'Proponer'}
Producto: ${input.product || 'Proponer'}

Genera la estrategia de la campaña en formato JSON basándote en estos datos.
`;

  return ai.generateStructured(systemPrompt, userPrompt, CampaignStrategySchema, {
    campaignId,
    type: 'CAMPAIGN_STRATEGY',
    version: 'v1',
  });
}

export async function generatePostVariants(campaignId: string, strategy: unknown) {
  const context = await getChpKnowledgeContext();
  const systemPrompt = `Eres un copywriter experto para grupos de Facebook para CHP Personalizados.
Reglas estrictas:
- Crea exactamente 10 variantes de publicación.
- Cada variante debe ser REALMENTE diferente (no solo cambiar un par de palabras).
- Variar ángulos: emprendimiento, identidad visual, regalos, uniformes corporativos, mayoreo, etc.
- No sonar a spam. Evitar exceso de emojis, mayúsculas y "COMPRA YA".
- Evita repetir el mismo hook inicial y la misma CTA.
- Las CTAs deben invitar a conversar por WhatsApp o enviar mensaje.
${context}
`;

  const userPrompt = `
Basado en esta estrategia:
${JSON.stringify(strategy, null, 2)}

Genera 10 variantes de copy. Asegúrate de incluir la explicación breve ('explanation') de por qué esta variante es útil.
`;

  return ai.generateStructured(systemPrompt, userPrompt, PostVariantsSchema, {
    campaignId,
    type: 'POST_VARIANTS',
    version: 'v1',
  });
}

export async function generateCreativeBriefs(campaignId: string, strategy: unknown) {
  const systemPrompt = `Eres un director de arte para CHP Personalizados.
Necesitas generar conceptos visuales que acompañen la campaña en Facebook.
`;

  const userPrompt = `
Estrategia:
${JSON.stringify(strategy, null, 2)}

Genera de 3 a 5 conceptos de "Creative Briefs" detallados, incluyendo un prompt optimizado para IA generativa de imágenes (ej. DALL-E 3).
`;

  return ai.generateStructured(systemPrompt, userPrompt, CreativeBriefsSchema, {
    campaignId,
    type: 'CREATIVE_BRIEFS',
    version: 'v1',
  });
}
