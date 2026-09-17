export interface ImageProviderConfig {
  model?: string;
  provider?: 'openai' | string;
}

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9' | string;
  size?: string;
  quality?: 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto' | string;
  format?: 'png' | 'jpeg' | 'webp';
  referenceImages?: string[];
}

export interface ImageGenerationResult {
  imageUrl: string; // data URI / base64 or temporary URL from provider
  imageBuffer: Buffer;
  provider: string;
  model: string;
  prompt: string;
  requestedSize: string;
  requestedQuality: string;
  aspectRatio: string;
  estimatedCost: number | null;
  actualUsage: Record<string, unknown> | null;
  costNote: string;
  createdAt: string;
}

export interface ImageModelCapabilities {
  provider: string;
  model: string;
  supportedSizes: string[];
  supportedAspectRatios: string[];
  supportedQualities: string[];
  supportsReferenceImages: boolean;
  notes: string;
}

export const DEFAULT_IMAGE_PROVIDER = process.env.IMAGE_PROVIDER || 'openai';
export const DEFAULT_IMAGE_MODEL = process.env.IMAGE_PROVIDER_MODEL || 'gpt-image-2.5-flare';

/**
 * Returns model capabilities and constraints without hardcoding DALL-E or any specific version across the app.
 */
export function getImageCapabilities(provider: string = DEFAULT_IMAGE_PROVIDER, model: string = DEFAULT_IMAGE_MODEL): ImageModelCapabilities {
  if (provider === 'openai') {
    // Current generation: gpt-image-2.5 family (flare & sunburst)
    if (model.includes('gpt-image') || model.includes('flare') || model.includes('sunburst')) {
      return {
        provider: 'openai',
        model,
        supportedSizes: [
          '1024x1024', // 1:1 square
          '1024x1280', // 4:5 vertical feed
          '1024x1824', // 9:16 stories / reels
          '1824x1024', // 16:9 landscape
          '2048x2048', // 1:1 high-res
        ],
        supportedAspectRatios: ['1:1', '4:5', '9:16', '16:9'],
        supportedQualities: ['auto', 'low', 'medium', 'high', 'xhigh'],
        supportsReferenceImages: true,
        notes: 'Requiere dimensiones con ancho y alto múltiplos de 16 y aspecto entre 1:3 y 3:1. Facturación basada en tokens (input/output).',
      };
    }

    // Legacy DALL-E 3 fallback
    if (model === 'dall-e-3') {
      return {
        provider: 'openai',
        model: 'dall-e-3',
        supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
        supportedAspectRatios: ['1:1', '9:16', '16:9'],
        supportedQualities: ['standard', 'hd'],
        supportsReferenceImages: false,
        notes: 'Modelo legacy. No soporta directamente aspect ratio 4:5.',
      };
    }

    // Generic OpenAI-compatible default
    return {
      provider: 'openai',
      model,
      supportedSizes: ['1024x1024'],
      supportedAspectRatios: ['1:1'],
      supportedQualities: ['standard'],
      supportsReferenceImages: false,
      notes: 'Configuración genérica para modelo compatible.',
    };
  }

  return {
    provider,
    model,
    supportedSizes: ['1024x1024'],
    supportedAspectRatios: ['1:1'],
    supportedQualities: ['standard'],
    supportsReferenceImages: false,
    notes: `Proveedor ${provider} no reconocido oficialmente; usando configuración por defecto.`,
  };
}

/**
 * Resolves requested aspect ratio or size into dimensions strictly validated for the target provider and model.
 */
export function resolveModelDimensions(provider: string, model: string, aspectRatio: string = '1:1', requestedSize?: string): string {
  const caps = getImageCapabilities(provider, model);

  if (requestedSize) {
    if (caps.supportedSizes.includes(requestedSize)) {
      return requestedSize;
    }
    // For modern models, check if divisible by 16
    const parts = requestedSize.split('x').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (parts[0] % 16 === 0 && parts[1] % 16 === 0) {
        return requestedSize;
      }
    }
  }

  // Map aspect ratio to valid dimensions
  if (model.includes('gpt-image') || model.includes('flare') || model.includes('sunburst')) {
    switch (aspectRatio) {
      case '1:1':
        return '1024x1024';
      case '4:5':
        return '1024x1280'; // 1024 / 1280 = 0.8 (4:5), both divisible by 16
      case '9:16':
        return '1024x1824'; // 1024 / 1824 = 0.5614 ≈ 9/16 (0.5625), both divisible by 16
      case '16:9':
        return '1824x1024'; // 1824 / 1024 = 1.78125 ≈ 16/9 (1.777), both divisible by 16
      default:
        return '1024x1024';
    }
  }

  // Legacy DALL-E 3
  if (model === 'dall-e-3') {
    switch (aspectRatio) {
      case '1:1':
        return '1024x1024';
      case '9:16':
        return '1024x1792';
      case '16:9':
        return '1792x1024';
      case '4:5':
        // DALL-E 3 doesn't support 4:5 natively; fallback to square with clear warning
        console.warn('[ImageGenerationProvider] DALL-E 3 no soporta 4:5 nativamente. Usando 1024x1024.');
        return '1024x1024';
      default:
        return '1024x1024';
    }
  }

  return '1024x1024';
}

/**
 * Calculates estimated cost for transparency before and during generation.
 */
export function estimateGenerationCost(provider: string, model: string, size: string, quality: string = 'standard'): { estimatedCost: number; note: string } {
  if (provider === 'openai') {
    if (model.includes('gpt-image') || model.includes('flare')) {
      // gpt-image-2.5-flare token-based pricing approximation (~$0.02 - $0.04 per image)
      const isHighRes = size.includes('1824') || size.includes('2048');
      const estimatedCost = isHighRes ? 0.035 : 0.025;
      return {
        estimatedCost,
        note: 'Costo estimado basado en consumo aproximado de tokens de entrada y salida para gpt-image-2.5-flare. El cobro real puede variar según complejidad visual.',
      };
    }

    if (model === 'dall-e-3') {
      const isStandardSquare = size === '1024x1024' && quality !== 'hd';
      const estimatedCost = isStandardSquare ? 0.040 : 0.080;
      return {
        estimatedCost,
        note: 'Costo estimado según tarifa base de DALL-E 3 estándar/HD.',
      };
    }
  }

  return {
    estimatedCost: 0.030,
    note: 'Costo estimado de referencia para modelo de imágenes.',
  };
}

export class ImageGenerationProvider {
  config: ImageProviderConfig;

  constructor(config?: ImageProviderConfig) {
    this.config = {
      provider: config?.provider || DEFAULT_IMAGE_PROVIDER,
      model: config?.model || DEFAULT_IMAGE_MODEL,
    };
  }

  getCapabilities(): ImageModelCapabilities {
    return getImageCapabilities(this.config.provider, this.config.model);
  }

  /**
   * Generates an image using the configured provider and model without hardcoded assumptions.
   */
  async generateImage(options: GenerateImageOptions): Promise<ImageGenerationResult> {
    const provider = this.config.provider || DEFAULT_IMAGE_PROVIDER;
    const model = this.config.model || DEFAULT_IMAGE_MODEL;
    const aspectRatio = options.aspectRatio || '1:1';
    const quality = options.quality || 'standard';
    const size = resolveModelDimensions(provider, model, aspectRatio, options.size);

    console.log(`[ImageGenerationProvider] Solicitando generación - Proveedor: ${provider}, Modelo: ${model}, Tamaño: ${size}, AspectRatio: ${aspectRatio}`);

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno.');
      }

      const costEst = estimateGenerationCost(provider, model, size, quality);

      const requestPayload: Record<string, unknown> = {
        model,
        prompt: options.prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      };

      // Pass quality if supported
      if (model === 'dall-e-3' && (quality === 'standard' || quality === 'hd')) {
        requestPayload.quality = quality;
      }

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[ImageGenerationProvider] Error en API con modelo ${model}:`, errorData);

        // Intento de fallback automático a dall-e-3 si el modelo moderno falla o no está disponible en la cuenta
        if (model !== 'dall-e-3') {
          console.warn('[ImageGenerationProvider] Reintentando con modelo fallback dall-e-3...');
          try {
            const fallbackPayload = {
              model: 'dall-e-3',
              prompt: options.prompt,
              n: 1,
              size: '1024x1024',
              response_format: 'b64_json',
            };
            const fallbackResponse = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify(fallbackPayload),
            });

            if (fallbackResponse.ok) {
              const fbData = await fallbackResponse.json();
              if (fbData.data && fbData.data[0]) {
                const b64 = fbData.data[0].b64_json;
                const buf = b64 ? Buffer.from(b64, 'base64') : Buffer.from([]);
                return {
                  imageUrl: b64 ? `data:image/png;base64,${b64}` : (fbData.data[0].url || ''),
                  imageBuffer: buf,
                  provider: 'openai',
                  model: 'dall-e-3',
                  prompt: options.prompt,
                  requestedSize: '1024x1024',
                  requestedQuality: 'standard',
                  aspectRatio: '1:1',
                  estimatedCost: 0.04,
                  actualUsage: null,
                  costNote: 'Generado con fallback automático DALL-E 3',
                  createdAt: new Date().toISOString(),
                };
              }
            } else {
              const fbErrData = await fallbackResponse.json().catch(() => ({}));
              console.error('[ImageGenerationProvider] Error en fallback dall-e-3:', fbErrData);
            }
          } catch (fbErr) {
            console.error('[ImageGenerationProvider] Excepción en fallback dall-e-3:', fbErr);
          }
        }

        const errMsg = errorData.error?.message || `Error HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`OpenAI API Error (${model}): ${errMsg}`);
      }

      const data = await response.json();
      if (!data.data || !data.data[0]) {
        throw new Error('La respuesta del proveedor no contiene datos de imagen válidos.');
      }

      const b64Json = data.data[0].b64_json;
      const buffer = b64Json
        ? Buffer.from(b64Json, 'base64')
        : Buffer.from([]);

      // Extract actual usage if provider supplies it
      const actualUsage = (data.usage as Record<string, unknown>) || null;

      return {
        imageUrl: b64Json ? `data:image/png;base64,${b64Json}` : (data.data[0].url || ''),
        imageBuffer: buffer,
        provider,
        model,
        prompt: options.prompt,
        requestedSize: size,
        requestedQuality: quality,
        aspectRatio,
        estimatedCost: costEst.estimatedCost,
        actualUsage,
        costNote: costEst.note,
        createdAt: new Date().toISOString(),
      };
    }

    throw new Error(`Proveedor de imágenes no soportado: ${provider}`);
  }
}

export const imageProvider = new ImageGenerationProvider();
