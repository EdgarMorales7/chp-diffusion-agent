'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando Campaña e IA...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generar Campaña Completa
        </>
      )}
    </Button>
  );
}
