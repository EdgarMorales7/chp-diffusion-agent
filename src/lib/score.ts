// Calcula el Opportunity Score basado en varias dimensiones del grupo

export interface GroupScoreInput {
  approximate_member_count?: number | null;
  relevance_score?: number | null; // 0-100 dado por el usuario o IA sobre qué tan relevante es el nicho
  activity_level?: string | null; // 'High', 'Medium', 'Low'
  advertising_allowed?: boolean | null;
  approval_required?: boolean | null;
}

export interface ScoreResult {
  score: number;
  reasons: string[];
}

export function calculateOpportunityScore(input: GroupScoreInput): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Si no se permite publicidad, el score se penaliza fuertemente
  if (input.advertising_allowed === false) {
    return { score: 0, reasons: ['Publicidad explícitamente prohibida.'] };
  }

  // 1. Relevancia Base (Peso Fuerte)
  if (input.relevance_score) {
    score += input.relevance_score * 0.4; // 40% del total
    reasons.push(`+${Math.round(input.relevance_score * 0.4)} por relevancia del nicho.`);
  }

  // 2. Tamaño de la audiencia (Peso Medio)
  if (input.approximate_member_count) {
    if (input.approximate_member_count > 100000) {
      score += 30;
      reasons.push('+30 por tamaño de audiencia masivo (>100k).');
    } else if (input.approximate_member_count > 10000) {
      score += 20;
      reasons.push('+20 por tamaño de audiencia grande (>10k).');
    } else if (input.approximate_member_count > 1000) {
      score += 10;
      reasons.push('+10 por tamaño de audiencia media.');
    }
  }

  // 3. Nivel de actividad
  if (input.activity_level) {
    if (input.activity_level.toLowerCase() === 'high') {
      score += 20;
      reasons.push('+20 por actividad alta.');
    } else if (input.activity_level.toLowerCase() === 'medium') {
      score += 10;
      reasons.push('+10 por actividad media.');
    }
  }

  // 4. Aprobación requerida (Pequeña penalización logística)
  if (input.approval_required) {
    score -= 5;
    reasons.push('-5 porque requiere aprobación manual.');
  }

  // Cap at 100
  score = Math.min(Math.max(Math.round(score), 0), 100);

  if (score === 0 && reasons.length === 0) {
    reasons.push('Faltan datos para evaluar correctamente.');
  }

  return { score, reasons };
}
