'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Download, 
  SkipForward, 
  ArrowRight, 
  XCircle,
  ThumbsUp,
  Clock,
  ClipboardCheck,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { 
  markTaskAsPublished, 
  skipQueueTask, 
  markTaskAsPrepared, 
  approveQueueTask, 
  recordGroupOpened, 
  getNextTask 
} from "../../actions";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export default function PrepareTaskClient({ task }: { task: any }) {
  const router = useRouter();
  
  const [currentStatus, setCurrentStatus] = useState<string>(task.status || 'Draft');
  const [preparedAt, setPreparedAt] = useState<string | null>(task.prepared_at || null);
  const [approvedAt, setApprovedAt] = useState<string | null>(task.approved_at || null);
  
  const [copied, setCopied] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [openedFb, setOpenedFb] = useState(Boolean(task.opened_at));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextTaskId, setNextTaskId] = useState<string | null>(null);

  // 5 checklist points strictly aligned with instructions
  const [checklist, setChecklist] = useState({
    group: false,
    rules: false,
    copy: false,
    image: false,
    cta: false,
  });

  const [fbUrl, setFbUrl] = useState(task.facebook_post_url || '');
  const [notes, setNotes] = useState(task.publication_notes || '');

  // Detect rules
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const confirmedProhibited = task.group_rules?.find((r: any) => r.rule_type === 'Advertising' && r.value === 'Prohibited' && r.status === 'Confirmed');
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const pendingRules = task.group_rules?.filter((r: any) => r.status === 'Pending Verification' || r.status === 'Needs verification') || [];

  // Full copy text
  const fullCopy = `${task.post_variants?.hook || ''}\n\n${task.post_variants?.body || ''}\n\n${task.post_variants?.cta || ''}`;

  useEffect(() => {
    // Fetch next actionable task id
    getNextTask(task.id).then(id => {
      if (id) setNextTaskId(id);
    });
  }, [task.id]);

  // Idempotent preparation tracker
  const ensurePrepared = async () => {
    if (!preparedAt) {
      const now = new Date().toISOString();
      setPreparedAt(now);
      if (currentStatus === 'Draft' || currentStatus === 'Planned') {
        setCurrentStatus('Ready');
      }
      await markTaskAsPrepared(task.id);
    }
  };

  const handleManualPrepare = async () => {
    setIsPreparing(true);
    try {
      await ensurePrepared();
    } finally {
      setIsPreparing(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      setApprovedAt(now);
      setCurrentStatus('Approved');
      await approveQueueTask(task.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setChecklist(prev => ({ ...prev, copy: true, cta: true }));
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = async () => {
    if (task.creatives?.image_url) {
      setIsDownloading(true);
      try {
        const res = await fetch(task.creatives.image_url);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedCampaign = (task.campaigns?.name || 'Campaign').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
        a.download = `CHP_${sanitizedCampaign}_${task.id.slice(0, 8)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch {
        // Fallback: direct window open if cross-origin fetch is blocked
        window.open(task.creatives.image_url, '_blank');
      } finally {
        setIsDownloading(false);
        setChecklist(prev => ({ ...prev, image: true }));
      }
    }
  };

  const handleOpenFb = async () => {
    let url = task.groups?.facebook_url;
    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://www.facebook.com/groups', '_blank', 'noopener,noreferrer');
    }
    setOpenedFb(true);
    setChecklist(prev => ({ ...prev, group: true }));
    await recordGroupOpened(task.id);
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await markTaskAsPublished(task.id, fbUrl, notes);
      setCurrentStatus('Published');
      
      const nextId = await getNextTask(task.id);
      if (nextId) {
        router.push(`/queue/prepare/${nextId}`);
      } else {
        router.push('/queue');
      }
    } catch (err) {
      console.error('Error marking as published:', err);
      alert('Error al marcar la publicación como realizada. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (confirm('¿Seguro que deseas omitir esta publicación?')) {
      setIsSubmitting(true);
      try {
        await skipQueueTask(task.id, notes);
        setCurrentStatus('Skipped');

        const nextId = await getNextTask(task.id);
        if (nextId) {
          router.push(`/queue/prepare/${nextId}`);
        } else {
          router.push('/queue');
        }
      } catch (err) {
        console.error('Error skipping task:', err);
        alert('Error al omitir la tarea.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Keyboard shortcuts (C: copy, D: download, G: open group, P: publish, N: next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      switch (e.key.toLowerCase()) {
        case 'c': handleCopy(); break;
        case 'd': handleDownload(); break;
        case 'g': handleOpenFb(); break;
        case 'p': 
          if (openedFb) handlePublish();
          break;
        case 'n':
          if (nextTaskId) router.push(`/queue/prepare/${nextTaskId}`);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullCopy, task.groups?.facebook_url, task.creatives?.image_url, openedFb, nextTaskId, fbUrl, notes]);



  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/queue">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Estación de Publicación</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline">{new Date(task.scheduled_for).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Badge>
              <Badge variant={
                currentStatus === 'Published' ? 'default' : 
                currentStatus === 'Approved' ? 'default' :
                currentStatus === 'Skipped' ? 'outline' : 'secondary'
              } className={currentStatus === 'Approved' ? 'bg-emerald-600' : ''}>
                {currentStatus}
              </Badge>
              {task.priority === 'High' && <Badge variant="destructive">Alta Prioridad</Badge>}
              {preparedAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Prep: {new Date(preparedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {approvedAt && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Aprobada: {new Date(approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar for Preparation & Approval */}
        <div className="flex flex-wrap items-center gap-2">
          {!preparedAt ? (
            <Button onClick={handleManualPrepare} disabled={isPreparing} variant="outline" size="sm" className="gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50">
              {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              {isPreparing ? "Preparando..." : "Iniciar Preparación"}
            </Button>
          ) : (
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 py-1.5 px-3">
              ✓ En Preparación
            </Badge>
          )}

          {currentStatus !== 'Approved' && currentStatus !== 'Published' && (
            <Button 
              onClick={handleApprove} 
              disabled={isSubmitting} 
              variant="outline" 
              size="sm" 
              className="gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
              {isSubmitting ? "Aprobando..." : "Aprobar Publicación"}
            </Button>
          )}

          <div className="hidden lg:flex gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
            <span>Atajos:</span>
            <kbd className="font-mono bg-white border px-1 rounded">C</kbd>
            <kbd className="font-mono bg-white border px-1 rounded">D</kbd>
            <kbd className="font-mono bg-white border px-1 rounded">G</kbd>
            <kbd className="font-mono bg-white border px-1 rounded">P</kbd>
            <kbd className="font-mono bg-white border px-1 rounded">N</kbd>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: Group & Copy (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Group Details & Warnings */}
          <Card className={confirmedProhibited ? "border-red-300" : ""}>
            <CardHeader className={`pb-3 ${confirmedProhibited ? "bg-red-50/50" : "bg-slate-50/50"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Destino</p>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {task.groups?.name}
                    {task.groups?.category_id && <Badge variant="secondary" className="font-normal">{task.groups.group_categories?.name}</Badge>}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              {/* Rules Warning Block */}
              {confirmedProhibited ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <XCircle className="h-5 w-5" /> Publicidad Prohibida
                  </div>
                  <p className="text-sm">Las reglas de este grupo prohíben explícitamente la publicidad. Publicar aquí puede resultar en un baneo de Facebook.</p>
                  <Button variant="destructive" size="sm" className="mt-3" onClick={handleSkip}>
                    Omitir esta tarea
                  </Button>
                </div>
              ) : pendingRules.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <AlertTriangle className="h-5 w-5" /> Reglas Pendientes de Verificación
                  </div>
                  <p className="text-sm mb-3">Revisa manualmente las reglas del grupo antes de publicar para evitar penalizaciones.</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {pendingRules.map((rule: any) => (
                      <li key={rule.id}>
                        <strong>{rule.rule_type}:</strong> {rule.value || rule.description || 'Sin detalles'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Publicidad Permitida</p>
                    <p className="text-sm">Según los registros estructurados, este grupo permite publicidad.</p>
                  </div>
                </div>
              )}

              {/* Group Context */}
              <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t">
                <div>
                  <p className="text-muted-foreground mb-1">Campaña Activa</p>
                  <p className="font-medium">{task.campaigns?.name}</p>
                </div>
                {task.groups?.approximate_member_count && (
                  <div>
                    <p className="text-muted-foreground mb-1">Miembros Aprox.</p>
                    <p className="font-medium">{task.groups.approximate_member_count.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Copy Box */}
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Texto de la Publicación</CardTitle>
              <Button onClick={handleCopy} variant={copied ? "default" : "outline"} className={copied ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                {copied ? <><CheckCircle className="w-4 h-4 mr-2"/> Copiado</> : <><Copy className="w-4 h-4 mr-2"/> Copiar Texto</>}
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="bg-slate-50 p-5 rounded-md border text-base whitespace-pre-wrap font-sans text-slate-800">
                <span className="font-bold text-lg block mb-4">{task.post_variants?.hook}</span>
                {task.post_variants?.body}
                <span className="text-indigo-600 font-bold block mt-4">{task.post_variants?.cta}</span>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Creative & Execution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Creative Box */}
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Imagen</CardTitle>
              {task.creatives?.image_url && (
                <Button onClick={handleDownload} disabled={isDownloading} variant="outline" size="sm" className="gap-2">
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isDownloading ? "Descargando..." : "Descargar"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {task.creatives?.image_url ? (
                <div className="relative rounded-lg overflow-hidden border shadow-sm group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={task.creatives.image_url} alt="Creative" className="w-full h-auto object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button onClick={handleDownload} disabled={isDownloading} variant="secondary" className="gap-2">
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isDownloading ? "Descargando..." : "Descargar Imagen"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground rounded-lg border">
                  Sin Imagen Asignada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Execution Box */}
          <Card className="border-indigo-200 shadow-md sticky top-6">
            <CardHeader className="bg-indigo-50/50 pb-3">
              <CardTitle className="text-lg">Ejecución Manual</CardTitle>
            </CardHeader>
            
            <CardContent className="pt-4 space-y-4">
              
              {/* Interactive Checklist (5 points) */}
              <div className="space-y-2 mb-4 bg-slate-50/60 p-3 rounded-md border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Checklist previo:</p>
                  <span className="text-xs text-muted-foreground">
                    {Object.values(checklist).filter(Boolean).length}/5
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="chk-group" 
                    checked={checklist.group}
                    onCheckedChange={(c) => setChecklist(p => ({ ...p, group: !!c }))}
                  />
                  <Label htmlFor="chk-group" className="text-xs cursor-pointer">Grupo correcto</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="chk-rules" 
                    checked={checklist.rules}
                    onCheckedChange={(c) => setChecklist(p => ({ ...p, rules: !!c }))}
                  />
                  <Label htmlFor="chk-rules" className="text-xs cursor-pointer">Reglas revisadas</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="chk-copy" 
                    checked={checklist.copy}
                    onCheckedChange={(c) => setChecklist(p => ({ ...p, copy: !!c }))}
                  />
                  <Label htmlFor="chk-copy" className="text-xs cursor-pointer">Copy revisado</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="chk-image" 
                    checked={checklist.image}
                    onCheckedChange={(c) => setChecklist(p => ({ ...p, image: !!c }))}
                  />
                  <Label htmlFor="chk-image" className="text-xs cursor-pointer">Imagen revisada</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="chk-cta" 
                    checked={checklist.cta}
                    onCheckedChange={(c) => setChecklist(p => ({ ...p, cta: !!c }))}
                  />
                  <Label htmlFor="chk-cta" className="text-xs cursor-pointer">CTA revisada</Label>
                </div>
              </div>

              <Button 
                onClick={handleOpenFb} 
                disabled={confirmedProhibited}
                className="w-full gap-2 py-6 text-lg" 
                size="lg"
              >
                Abrir Grupo en Facebook <ExternalLink className="h-5 w-5" />
              </Button>

              {openedFb && (
                <div className="bg-slate-50 p-4 rounded-md border mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h3 className="font-bold text-center text-indigo-900 border-b pb-2">¿Ya publicaste?</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fbUrl" className="text-xs">URL del Post en Facebook (Opcional)</Label>
                    <Input 
                      id="fbUrl" 
                      placeholder="https://facebook.com/groups/.../posts/..." 
                      value={fbUrl}
                      onChange={(e) => setFbUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs">Notas de la publicación (Opcional)</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Ej. Post enviado a aprobación de administradores..." 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none h-16 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button 
                      onClick={handleSkip} 
                      variant="outline" 
                      className="w-full text-slate-600" 
                      disabled={isSubmitting}
                    >
                      <SkipForward className="h-4 w-4 mr-1.5" /> Omitir
                    </Button>
                    <Button 
                      onClick={handlePublish} 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1.5" /> Publicada
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            
            {/* Next Task Indicator */}
            {nextTaskId && (
              <CardFooter className="bg-muted/30 border-t pt-4">
                <div className="w-full flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">Siguiente tarea en cola:</span>
                  <Link href={`/queue/prepare/${nextTaskId}`} className="text-indigo-600 hover:underline flex items-center font-medium text-xs">
                    Ver Siguiente <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              </CardFooter>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
