import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ImageGenerationProvider,
  getImageCapabilities,
  resolveModelDimensions,
  estimateGenerationCost,
} from './imageProvider';

describe('ImageGenerationProvider (Unit Tests - Mocked)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws an error if OPENAI_API_KEY is not defined', async () => {
    const provider = new ImageGenerationProvider({ provider: 'openai', model: 'gpt-image-2.5-flare' });
    vi.stubEnv('OPENAI_API_KEY', '');

    await expect(provider.generateImage({ prompt: 'test' })).rejects.toThrow('OPENAI_API_KEY no está configurada');
  });

  it('throws an error for unsupported providers', async () => {
    const provider = new ImageGenerationProvider({ provider: 'unsupported-provider' });

    await expect(provider.generateImage({ prompt: 'test' })).rejects.toThrow('Proveedor de imágenes no soportado: unsupported-provider');
  });

  it('returns valid capabilities for modern gpt-image-2.5-flare and legacy dall-e-3', () => {
    const flareCaps = getImageCapabilities('openai', 'gpt-image-2.5-flare');
    expect(flareCaps.supportedAspectRatios).toContain('4:5');
    expect(flareCaps.supportedAspectRatios).toContain('16:9');
    expect(flareCaps.supportsReferenceImages).toBe(true);

    const legacyCaps = getImageCapabilities('openai', 'dall-e-3');
    expect(legacyCaps.supportedAspectRatios).not.toContain('4:5');
    expect(legacyCaps.supportsReferenceImages).toBe(false);
  });

  it('resolves dimensions correctly conforming to 16-divisible rules for gpt-image-2.5-flare', () => {
    const dim1to1 = resolveModelDimensions('openai', 'gpt-image-2.5-flare', '1:1');
    expect(dim1to1).toBe('1024x1024');

    const dim4to5 = resolveModelDimensions('openai', 'gpt-image-2.5-flare', '4:5');
    expect(dim4to5).toBe('1024x1280');
    expect(1024 % 16).toBe(0);
    expect(1280 % 16).toBe(0);

    const dim16to9 = resolveModelDimensions('openai', 'gpt-image-2.5-flare', '16:9');
    expect(dim16to9).toBe('1824x1024');
    expect(1824 % 16).toBe(0);
    expect(1024 % 16).toBe(0);
  });

  it('calculates estimated cost transparently and marks it as an estimate', () => {
    const est = estimateGenerationCost('openai', 'gpt-image-2.5-flare', '1024x1024');
    expect(est.estimatedCost).toBeGreaterThan(0);
    expect(est.note).toContain('Costo estimado');
  });

  it('calls fetch with modern parameters for gpt-image-2.5-flare without hardcoding', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-mock-key-for-test');
    const provider = new ImageGenerationProvider({ provider: 'openai', model: 'gpt-image-2.5-flare' });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ b64_json: 'aGVsbG8=' }], // "hello" in base64
        usage: { total_tokens: 1250 },
      }),
    } as unknown as Response);

    const result = await provider.generateImage({
      prompt: 'Playera básica de algodón color negro con estampado DTF',
      aspectRatio: '4:5',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/images/generations', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-mock-key-for-test',
      },
    }));

    // Converted to 1024x1280 for 4:5
    expect(result.requestedSize).toBe('1024x1280');
    expect(result.model).toBe('gpt-image-2.5-flare');
    expect(result.imageBuffer).toBeInstanceOf(Buffer);
    expect(result.actualUsage).toEqual({ total_tokens: 1250 });
    expect(result.estimatedCost).toBeDefined();
  });
});

/**
 * OPTIONAL LIVE INTEGRATION TEST
 * WARNING: Consumes real OpenAI credits.
 * ONLY runs when RUN_EXTERNAL_IMAGE_TESTS="true" is explicitly set in the environment.
 * Will NEVER run during standard 'npm run test', 'npm run build' or CI pipelines.
 */
const runLiveExternal = process.env.RUN_EXTERNAL_IMAGE_TESTS === 'true' && Boolean(process.env.OPENAI_API_KEY);

describe.runIf(runLiveExternal)('Live OpenAI API Integration Test (Consumes Quota)', () => {
  it('connects to live OpenAI Image API and generates a real image', async () => {
    const provider = new ImageGenerationProvider({
      provider: 'openai',
      model: process.env.IMAGE_PROVIDER_MODEL || 'gpt-image-2.5-flare',
    });

    const result = await provider.generateImage({
      prompt: 'Minimalist white cotton crewneck t-shirt product photo on plain neutral background',
      aspectRatio: '1:1',
    });

    expect(result.imageBuffer.length).toBeGreaterThan(0);
    expect(result.model).toBeDefined();
  }, 60000); // 60s timeout for live network call
});
