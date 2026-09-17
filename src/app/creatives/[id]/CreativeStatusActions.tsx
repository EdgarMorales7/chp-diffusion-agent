'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { updateCreativeStatus } from '../actions';
import { useRouter } from 'next/navigation';

interface CreativeStatusActionsProps {
  creativeId: string;
  initialStatus: string;
}

export function CreativeStatusActions({ creativeId, initialStatus }: CreativeStatusActionsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStatusUpdate = async (newStatus: 'Approved' | 'Rejected') => {
    try {
      setLoading(newStatus === 'Approved' ? 'approve' : 'reject');
      setError(null);

      const res = await updateCreativeStatus(creativeId, newStatus);
      if (!res.success) {
        setError(res.error || 'Error al actualizar el estado.');
        return;
      }

      setStatus(newStatus);
      router.refresh();
    } catch (err: unknown) {
      console.error('Error al actualizar estado:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Badge 
          variant={status === 'Approved' ? 'default' : status === 'Rejected' ? 'destructive' : 'secondary'}
          className="text-xs px-2.5 py-1"
        >
          {status === 'Approved' ? 'Aprobado' : status === 'Rejected' ? 'Rechazado' : status}
        </Badge>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading !== null || status === 'Rejected'}
            onClick={() => handleStatusUpdate('Rejected')}
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            {loading === 'reject' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Rechazando...</span>
              </>
            ) : (
              <>
                <X className="h-3.5 w-3.5" />
                <span>Rechazar</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            disabled={loading !== null || status === 'Approved'}
            onClick={() => handleStatusUpdate('Approved')}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            {loading === 'approve' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Aprobando...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>{status === 'Approved' ? 'Aprobado' : 'Aprobar'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
