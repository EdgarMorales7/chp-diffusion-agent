import { createAdminClient } from '@/lib/supabase/server';

const FALLBACK_KNOWLEDGE_BASE = `
EMPRESA: CHP Personalizados.
SERVICIOS: Personalización de prendas mediante DTF, DTG y Bordado.
PRODUCTOS PRINCIPALES: Playeras básicas, Sudaderas, Polos, Uniformes.
REGLA PRINCIPAL: Nunca inventar precios, fechas de entrega ni cifras. Si falta info comercial, usar 'MISSING_INFORMATION' o redirigir a WhatsApp.
`;

export async function getChpKnowledgeContext(): Promise<string> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('business_settings')
      .select('key, value');

    if (error || !data || data.length === 0) {
      return FALLBACK_KNOWLEDGE_BASE;
    }

    let context = 'CONOCIMIENTO COMERCIAL (FUENTE DE VERDAD):\n';
    
    // Convert settings into context
    for (const setting of data) {
      context += `[${setting.key.toUpperCase()}]: ${JSON.stringify(setting.value)}\n`;
    }

    context += `REGLA PRINCIPAL: Nunca inventar precios, fechas de entrega ni cifras. Si falta info comercial, usar 'MISSING_INFORMATION' o redirigir a WhatsApp.\n`;

    return context;
  } catch (err) {
    console.error('Failed to load business settings:', err);
    return FALLBACK_KNOWLEDGE_BASE;
  }
}
