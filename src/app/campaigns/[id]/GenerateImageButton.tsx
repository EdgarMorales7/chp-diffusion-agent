'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateCreative } from '@/app/creatives/actions';
import { useRouter } from 'next/navigation';

interface GenerateImageButtonProps {
  campaignId: string;
  briefId: string;
  estimatedCost: number;
  initialGeneratedCount?: number;
}

export function GenerateImageButton({
  campaignId,
  briefId,
  estimatedCost,
  initialGeneratedCount = 0,
}: GenerateImageButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const res = await generateCreative(campaignId, briefId, '1:1');
      if (!res.success) {
        setError(res.error || 'Error al generar la imagen.');
        return;
      }
      
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      console.error('Error generating image:', err);
      const message = err instanceof Error ? err.message : 'Error al generar la imagen. Intenta nuevamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5 pt-1">
      <Button
        onClick={handleGenerate}
        disabled={loading}
        variant={initialGeneratedCount > 0 ? "outline" : "secondary"}
        size="sm"
        className={`w-full text-xs transition-all ${
          loading ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-indigo-600" />
            <span>Generando imagen con IA...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            <span>¡Imagen Generada!</span>
          </>
        ) : initialGeneratedCount > 0 ? (
          <>
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
            <span>Generar otra versión (~${estimatedCost})</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            <span>Generar Imagen (~${estimatedCost})</span>
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-1 text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
}
