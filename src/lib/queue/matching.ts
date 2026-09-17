/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server';

export const DEFAULT_MIN_DAYS_BETWEEN_GROUP_POSTS = 3;
export const DEFAULT_DUPLICATE_WINDOW_DAYS = 7;

export function getMinDaysBetweenGroupPosts(): number {
  const val = process.env.MIN_DAYS_BETWEEN_GROUP_POSTS;
  if (val) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return DEFAULT_MIN_DAYS_BETWEEN_GROUP_POSTS;
}

export function getDuplicateWindowDays(): number {
  const val = process.env.DUPLICATE_WINDOW_DAYS;
  if (val) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return DEFAULT_DUPLICATE_WINDOW_DAYS;
}

export interface GroupAvailability {
  allowed: boolean;
  reason: string;
  warning?: boolean;
}

/**
 * Revisa la disponibilidad de un grupo priorizando campos estructurados:
 * - rule_type
 * - value
 * - status
 *
 * La descripción/evidence se utiliza como contexto, pero NO debe ser la única fuente
 * para decidir que una regla está prohibida.
 * Si la información estructurada no existe o es ambigua:
 * muestra "Needs verification". No asume.
 */
export async function checkGroupAvailability(
  groupId: string,
  scheduledDate: Date,
  options?: { minDays?: number }
): Promise<GroupAvailability> {
  const supabase = createAdminClient();

  const { data: rules } = await supabase.from('group_rules').select('*').eq('group_id', groupId);

  let warningMsg = '';

  const PROHIBITED_VALUES = [
    'prohibited',
    'forbidden',
    'not allowed',
    'disallowed',
    'no',
    'false',
    'bloqueado',
    'no permitida',
    'prohibida',
    'prohibido',
    'denied',
  ];
  const ALLOWED_VALUES = [
    'allowed',
    'permitted',
    'yes',
    'true',
    'permitida',
    'permitido',
    'libre',
    'abierto',
  ];
  const CONFIRMED_STATUSES = ['confirmed', 'verified', 'active'];

  if (!rules || rules.length === 0) {
    warningMsg = 'Needs verification: no existen reglas registradas para este grupo.';
  } else {
    // Buscar reglas relacionadas con publicidad usando rule_type estructurado
    const adRules = rules.filter((r: any) => {
      const type = (r.rule_type || '').toLowerCase().trim();
      return (
        type === 'advertising' ||
        type.includes('publicidad') ||
        type.includes('comercial') ||
        type.includes('ventas') ||
        type.includes('promocion')
      );
    });

    if (adRules.length === 0) {
      // No existe regla estructurada específica para publicidad
      warningMsg = 'Needs verification: no hay regla estructurada de publicidad.';
    } else {
      let hasConfirmedAllowed = false;
      let hasConfirmedProhibited = false;
      let prohibitedReason = '';

      for (const rule of adRules) {
        const ruleStatus = (rule.status || '').toLowerCase().trim();
        const ruleValue = (rule.value || '').toLowerCase().trim();
        const isConfirmed = CONFIRMED_STATUSES.includes(ruleStatus);

        if (isConfirmed && PROHIBITED_VALUES.includes(ruleValue)) {
          hasConfirmedProhibited = true;
          const context = rule.evidence || rule.description ? ` (${rule.evidence || rule.description})` : '';
          prohibitedReason = `No recomendado / bloqueado (Publicidad no permitida según regla confirmada: ${rule.rule_type}${context})`;
          break;
        }

        if (isConfirmed && ALLOWED_VALUES.includes(ruleValue)) {
          hasConfirmedAllowed = true;
        }
      }

      if (hasConfirmedProhibited) {
        return { allowed: false, reason: prohibitedReason };
      }

      if (!hasConfirmedAllowed) {
        // La información estructurada no existe o es ambigua (ej. status desconocido, value ausente o no estándar)
        // La descripción/evidence se añade sólo como contexto adicional sin bloquear
        const contextParts = adRules
          .map((r: any) => r.description || r.evidence)
          .filter(Boolean);
        const contextStr = contextParts.length > 0 ? ` (Contexto: ${contextParts.join('; ')})` : '';
        warningMsg = `Needs verification: regla de publicidad no confirmada en campos estructurados${contextStr}`;
      }
    }
  }

  // Verificar frecuencia configurable
  const minDays = options?.minDays ?? getMinDaysBetweenGroupPosts();

  const { data: recentPubs } = await supabase
    .from('publication_queue')
    .select('scheduled_for')
    .eq('group_id', groupId)
    .in('status', ['Published', 'Today', 'Approved', 'Ready', 'Planned'])
    .order('scheduled_for', { ascending: false })
    .limit(1);

  if (recentPubs && recentPubs.length > 0) {
    const lastPubDate = new Date(recentPubs[0].scheduled_for);
    const diffDays = Math.floor((scheduledDate.getTime() - lastPubDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < minDays) {
      const freqMsg = `No recomendado todavía (Última publicación hace ${diffDays} días; mínimo sugerido: ${minDays} días).`;
      return {
        allowed: true,
        warning: true,
        reason: warningMsg ? `${freqMsg} • ${warningMsg}` : freqMsg,
      };
    }
  }

  if (warningMsg) {
    return { allowed: true, warning: true, reason: warningMsg };
  }

  return { allowed: true, reason: 'Grupo disponible y frecuencia adecuada.' };
}

/**
 * Comprueba duplicados dentro de la ventana temporal configurable DUPLICATE_WINDOW_DAYS.
 */
export async function checkDuplicates(
  groupId: string,
  campaignId: string,
  postVariantId: string,
  creativeId: string,
  scheduledDate: Date,
  options?: { windowDays?: number }
): Promise<{ isDuplicate: boolean; reason?: string }> {
  const supabase = createAdminClient();
  const windowDays = options?.windowDays ?? getDuplicateWindowDays();

  const startDate = new Date(scheduledDate);
  startDate.setDate(startDate.getDate() - windowDays);
  const endDate = new Date(scheduledDate);
  endDate.setDate(endDate.getDate() + windowDays);

  const { data: existing } = await supabase
    .from('publication_queue')
    .select('id, group_id, post_variant_id, creative_id, campaign_id')
    .eq('group_id', groupId)
    .gte('scheduled_for', startDate.toISOString())
    .lte('scheduled_for', endDate.toISOString())
    .neq('status', 'Cancelled');

  if (existing && existing.length > 0) {
    for (const task of existing) {
      if (task.campaign_id === campaignId) {
        if (task.post_variant_id === postVariantId && task.creative_id === creativeId) {
          return {
            isDuplicate: true,
            reason: `Exactamente la misma combinación (Post + Creativo) ya está programada dentro de la ventana de ${windowDays} días.`,
          };
        }
        return {
          isDuplicate: true,
          reason: `Ya hay una publicación de esta campaña programada para este grupo dentro de la ventana de ${windowDays} días.`,
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Evalúa la coincidencia contextual entre grupo, post, creativo y campaña.
 *
 * NOTA IMPORTANTE:
 * El Match Score representa única y exclusivamente COINCIDENCIA CONTEXTUAL / COMPATIBILIDAD SUGERIDA.
 * NO representa probabilidad de venta, ROI, conversión ni rendimiento garantizado.
 */
export function calculateMatchScore(
  group: any,
  postVariant: any,
  creative: any,
  campaign: any
): { score: number; explanation: string } {
  let score = 0;
  const reasons: string[] = [];

  const groupName = (group.name || '').toLowerCase();
  const groupCat = (group.category_id || '').toLowerCase();
  const postAudience = (postVariant.audience || '').toLowerCase();
  const campaignAudience = (campaign.audience || '').toLowerCase();
  const campaignProduct = (campaign.product || '').toLowerCase();
  const briefConcept = (creative.creative_briefs?.visual_concept || '').toLowerCase();

  // Coincidencia contextual de audiencia
  if (postAudience && groupName.includes(postAudience.split(' ')[0])) {
    score += 30;
    reasons.push('Coincidencia contextual alta entre el texto y el nombre del grupo.');
  } else if (campaignAudience && groupName.includes(campaignAudience.split(' ')[0])) {
    score += 20;
    reasons.push('Coincidencia contextual de audiencia entre la campaña y el grupo.');
  }

  // Coincidencia de contexto y producto
  if (campaignProduct && groupCat && groupCat.includes(campaignProduct)) {
    score += 20;
    reasons.push('Compatibilidad sugerida entre la categoría del grupo y el producto.');
  }

  // Contexto visual
  if (briefConcept && groupName.includes('emprendedor') && briefConcept.includes('negocio')) {
    score += 15;
    reasons.push('Afinidad contextual del concepto visual con la temática del grupo.');
  }

  if (score === 0) {
    score = 10;
    reasons.push('Coincidencia contextual base. Compatibilidad sugerida moderada.');
  }

  return {
    score: Math.min(score, 100),
    explanation: reasons.join(' '),
  };
}
