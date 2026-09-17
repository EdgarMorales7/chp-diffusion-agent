import { describe, it, expect, vi } from 'vitest';
import { ai } from './provider';
import { generateCampaignStrategy } from './prompts';

vi.mock('./provider', () => {
  return {
    ai: {
      generateStructured: vi.fn().mockResolvedValue({
        objective: 'Test Objective',
        target_audience: 'Test Audience',
        core_offer: 'Test Offer',
        main_value_proposition: 'Test Value',
        communication_angles: ['Angle 1'],
        recommended_cta: 'Click Here',
        recommended_tone: 'Friendly',
        content_strategy: 'Content Strat'
      })
    }
  };
});

vi.mock('./contextBuilder', () => {
  return {
    getChpKnowledgeContext: vi.fn().mockResolvedValue('Mocked Context')
  };
});

describe('AI Content Engine', () => {
  it('calls provider to generate campaign strategy', async () => {
    const strategy = await generateCampaignStrategy('mock-campaign-123', {
      prompt: 'Playeras para empresas',
      audience: 'Empresas'
    });

    expect(ai.generateStructured).toHaveBeenCalled();
    expect(strategy.objective).toBe('Test Objective');
  });
});
