import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export interface AIProviderConfig {
  model?: string;
  provider?: 'openai';
  temperature?: number;
}

const DEFAULT_CONFIG: AIProviderConfig = {
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  provider: 'openai',
  temperature: 0.7,
};

export class AIProvider {
  config: AIProviderConfig;

  constructor(config: AIProviderConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async recordGeneration(
    campaignId: string,
    generationType: string,
    promptVersion: string,
    input: unknown,
    output: unknown
  ) {
    const supabase = createAdminClient();
    await supabase.from('ai_generations').insert({
      campaign_id: campaignId,
      generation_type: generationType,
      provider: this.config.provider,
      model: this.config.model,
      prompt_version: promptVersion,
      input,
      output,
    });
  }

  /**
   * Generates a structured output using the AI SDK.
   */
  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>,
    metadata?: { campaignId: string; type: string; version: string }
  ): Promise<T> {
    try {
      // Por ahora usamos openai fijamente, pero la abstracción permite cambiar esto en el futuro.
      const model = openai(this.config.model!);

      const { object } = await generateObject({
        model,
        schema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: this.config.temperature,
      });

      if (metadata) {
        await this.recordGeneration(
          metadata.campaignId,
          metadata.type,
          metadata.version,
          { systemPrompt, userPrompt },
          object
        );
      }

      return object as T;
    } catch (error) {
      console.error('Error generating structured output:', error);
      throw new Error('Falló la generación de IA. Revisa las variables de entorno o la conexión al proveedor.');
    }
  }
}

export const ai = new AIProvider();
