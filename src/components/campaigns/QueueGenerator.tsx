/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, AlertTriangle, Check, Loader2, Info } from 'lucide-react';
import { suggestQueueForCampaign, createQueueTask } from '@/app/queue/actions';

export function QueueGenerator({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await suggestQueueForCampaign(campaignId, 10);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Error al generar sugerencias.' });
        return;
      }
      const proposalsList = res.proposals || [];
      setProposals(proposalsList);
      if (proposalsList.length === 0) {
        setFeedback({ type: 'warning', text: 'No se encontraron coincidencias disponibles para los grupos activos.' });
      } else {
        setFeedback({ type: 'info', text: `Se encontraron ${proposalsList.length} coincidencias contextuales optimizadas.` });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Error al generar sugerencias' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (proposal: any) => {
    setSaving(proposal.groupId);
    setFeedback(null);
    try {
      const result = await createQueueTask({
        groupId: proposal.groupId,
        campaignId: proposal.campaignId,
        postVariantId: proposal.postVariantId,
        creativeId: proposal.creativeId,
        scheduledFor: proposal.scheduledFor,
        status: 'Planned',
      });

      if (result.error) {
        setFeedback({ type: 'error', text: result.message || 'Error al procesar la tarea' });
      } else if (result.warning) {
        setFeedback({ type: 'warning', text: result.message || 'Aviso de frecuencia o duplicado' });
      } else {
        setFeedback({ type: 'success', text: 'Publicación programada y agregada a la cola correctamente.' });
        setProposals(p => p.filter(x => x.groupId !== proposal.groupId));
      }
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="mt-8 border-indigo-200 shadow-sm">
      <CardHeader className="bg-indigo-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-indigo-600" />
            Cola de Publicaciones
          </CardTitle>
          <Button onClick={handleGenerate} disabled={loading} variant="secondary">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {proposals.length > 0 ? 'Regenerar Sugerencias' : 'Generar Sugerencias de Cola'}
          </Button>
        </div>
      </CardHeader>
      
      {feedback && (
        <div className={`mx-6 mt-4 p-3 rounded-md text-sm border flex items-center gap-2 ${
          feedback.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
          feedback.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
          feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
          'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
        }`}>
          {feedback.type === 'warning' ? <AlertTriangle className="h-4 w-4 flex-shrink-0" /> : <Info className="h-4 w-4 flex-shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {proposals.length > 0 && (
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            El sistema evalúa la coincidencia contextual entre la temática del grupo, el mensaje y el creativo.
            No representa una predicción de ventas, ROI, conversión ni rendimiento garantizado.
          </p>

          <div className="grid gap-4">
            {proposals.map((p, idx) => (
              <div key={idx} className="border rounded-lg p-4 flex gap-4 bg-card items-center relative">
                {p.creativePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.creativePreview} alt="Preview" className="w-16 h-16 rounded object-cover border" />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs">Sin Img</div>
                )}
                
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <h4 className="font-semibold text-sm">{p.groupName}</h4>
                    <Badge variant="outline">Compatibilidad sugerida: {p.score}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 italic">&quot;{p.postBodyPreview}&quot;</p>
                  <p className="text-xs text-indigo-600 flex items-center gap-1 mt-1">
                    <CalendarIcon className="h-3 w-3" /> {new Date(p.scheduledFor).toLocaleString()}
                  </p>
                  
                  {p.warning && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" /> {p.warning}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">💡 {p.explanation}</p>
                </div>

                <div>
                  <Button 
                    size="sm" 
                    onClick={() => handleApprove(p)}
                    disabled={saving === p.groupId}
                    className="gap-2"
                  >
                    {saving === p.groupId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Aprobar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
