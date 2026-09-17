import { describe, it, expect } from 'vitest';
import { calculateOpportunityScore } from './score';

describe('Opportunity Score', () => {
  it('penaliza si la publicidad está prohibida', () => {
    const result = calculateOpportunityScore({ advertising_allowed: false, relevance_score: 100 });
    expect(result.score).toBe(0);
    expect(result.reasons[0]).toContain('prohibida');
  });

  it('calcula score alto para grupo muy relevante y activo', () => {
    const result = calculateOpportunityScore({
      advertising_allowed: true,
      relevance_score: 90,
      approximate_member_count: 150000,
      activity_level: 'High'
    });
    // 90 * 0.4 = 36
    // >100k = 30
    // High act = 20
    // Total = 86
    expect(result.score).toBe(86);
  });

  it('resta puntos si requiere aprobación', () => {
    const result = calculateOpportunityScore({
      relevance_score: 50, // 20
      approval_required: true
    });
    // 20 - 5 = 15
    expect(result.score).toBe(15);
  });
});
