/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkGroupAvailability,
  checkDuplicates,
  calculateMatchScore,
  DEFAULT_MIN_DAYS_BETWEEN_GROUP_POSTS,
  DEFAULT_DUPLICATE_WINDOW_DAYS,
  getMinDaysBetweenGroupPosts,
  getDuplicateWindowDays,
} from './matching';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

describe('Queue Matching and Validation', () => {
  let mockSupabase: any;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };
    (supabaseServer.createAdminClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration reading', () => {
    it('uses default values when environment variables are not set', () => {
      delete process.env.MIN_DAYS_BETWEEN_GROUP_POSTS;
      delete process.env.DUPLICATE_WINDOW_DAYS;

      expect(getMinDaysBetweenGroupPosts()).toEqual(DEFAULT_MIN_DAYS_BETWEEN_GROUP_POSTS);
      expect(getDuplicateWindowDays()).toEqual(DEFAULT_DUPLICATE_WINDOW_DAYS);
    });

    it('reads configurable MIN_DAYS_BETWEEN_GROUP_POSTS and DUPLICATE_WINDOW_DAYS from env', () => {
      process.env.MIN_DAYS_BETWEEN_GROUP_POSTS = '5';
      process.env.DUPLICATE_WINDOW_DAYS = '14';

      expect(getMinDaysBetweenGroupPosts()).toEqual(5);
      expect(getDuplicateWindowDays()).toEqual(14);
    });
  });

  describe('Contextual compatibility (Match Score)', () => {
    it('calculateMatchScore weights matching contextual audiences and visual concepts without commercial promises', () => {
      const group = { name: 'Emprendedores y Negocios locales', category_id: 'Ropa' };
      const postVariant = { audience: 'emprendedores que buscan uniforme' };
      const creative = { creative_briefs: { visual_concept: 'Dueño de negocio usando polo' } };
      const campaign = { product: 'polo', audience: 'emprendedores' };

      const result = calculateMatchScore(group, postVariant, creative, campaign);

      expect(result.score).toEqual(45);
      expect(result.explanation).toContain('Coincidencia contextual alta');
    });
  });

  describe('Group Rules and checkGroupAvailability', () => {
    it('blocks if structured advertising rule is confirmed as prohibited', async () => {
      // Mock DB rules with structured fields
      mockSupabase.eq.mockResolvedValueOnce({
        data: [
          {
            rule_type: 'Advertising',
            value: 'Prohibited',
            status: 'Confirmed',
            description: 'Publicidad estrictamente prohibida',
          },
        ],
      });

      const result = await checkGroupAvailability('test-group', new Date());

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Publicidad no permitida según regla confirmada');
    });

    it('shows "Needs verification" and does NOT block when rule is unconfirmed or text-only', async () => {
      // Free text says prohibited, but status is Unknown and value is null (unconfirmed / ambiguous)
      mockSupabase.eq.mockResolvedValueOnce({
        data: [
          {
            rule_type: 'Advertising',
            value: null,
            status: 'Unknown',
            description: 'Venta prohibida sin permiso de admin',
          },
        ],
      });

      // No recent pubs
      mockSupabase.limit.mockResolvedValueOnce({ data: [] });

      const result = await checkGroupAvailability('test-group', new Date());

      expect(result.allowed).toBe(true);
      expect(result.warning).toBe(true);
      expect(result.reason).toContain('Needs verification');
    });

    it('shows "Needs verification" when there are no group rules', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ data: [] });
      mockSupabase.limit.mockResolvedValueOnce({ data: [] });

      const result = await checkGroupAvailability('test-group', new Date());

      expect(result.allowed).toBe(true);
      expect(result.warning).toBe(true);
      expect(result.reason).toContain('Needs verification');
    });

    it('allows publishing without warnings if structured advertising rule is confirmed as allowed', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: [
          {
            rule_type: 'Advertising',
            value: 'Allowed',
            status: 'Confirmed',
          },
        ],
      });

      // No recent pubs
      mockSupabase.limit.mockResolvedValueOnce({ data: [] });

      const result = await checkGroupAvailability('test-group', new Date());

      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.reason).toContain('Grupo disponible');
    });

    it('warns if frequency is higher than configurable MIN_DAYS_BETWEEN_GROUP_POSTS', async () => {
      process.env.MIN_DAYS_BETWEEN_GROUP_POSTS = '4';

      mockSupabase.eq.mockResolvedValueOnce({
        data: [
          {
            rule_type: 'Advertising',
            value: 'Allowed',
            status: 'Confirmed',
          },
        ],
      });

      // Last pub was 2 days ago (< 4 days)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ scheduled_for: twoDaysAgo.toISOString() }],
      });

      const result = await checkGroupAvailability('test-group', new Date());

      expect(result.allowed).toBe(true);
      expect(result.warning).toBe(true);
      expect(result.reason).toContain('Última publicación hace 2 días; mínimo sugerido: 4 días');
    });
  });

  describe('Duplicate checking', () => {
    it('returns true if exact same post and creative is found within configurable window', async () => {
      process.env.DUPLICATE_WINDOW_DAYS = '10';
      const scheduledDate = new Date();

      mockSupabase.neq.mockResolvedValueOnce({
        data: [{ campaign_id: 'c1', post_variant_id: 'p1', creative_id: 'img1' }],
      });

      const result = await checkDuplicates('g1', 'c1', 'p1', 'img1', scheduledDate);

      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toContain('ventana de 10 días');
    });
  });
});
