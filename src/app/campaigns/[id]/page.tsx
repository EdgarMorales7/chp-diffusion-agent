export const dynamic = 'force-dynamic';
import { getCampaignById } from "../actions";
import { getGenerationPreflight } from "@/app/creatives/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Strategy {
  objective?: string;
  target_audience?: string;
  main_value_proposition?: string;
  communication_angles?: string[];
  recommended_tone?: string;
  recommended_cta?: string;
}

import { QueueGenerator } from '@/components/campaigns/QueueGenerator';
import { GenerateImageButton } from "./GenerateImageButton";

export default async function CampaignDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const [campaign, preflight] = await Promise.all([
    getCampaignById(params.id),
    getGenerationPreflight(),
  ]);

  if (!campaign) {
    notFound();
  }

  const strategy = (campaign.strategy as Strategy) || {};

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <Badge variant="outline" className="mt-1">{campaign.status}</Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estrategia de Campaña</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Objetivo</h3>
                <p>{strategy.objective || campaign.objective || '-'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Público Objetivo</h3>
                <p>{strategy.target_audience || campaign.audience || '-'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Propuesta de Valor</h3>
                <p>{strategy.main_value_proposition || '-'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Ángulos de Comunicación</h3>
                <ul className="list-disc pl-5 mt-1">
                  {(strategy.communication_angles || []).map((angle: string, i: number) => (
                    <li key={i}>{angle}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Publicaciones ({campaign.variants.length})</h2>
            {campaign.variants.map((v: Record<string, string>, i: number) => (
              <Card key={v.id}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">Variante {i + 1} - {v.audience}</Badge>
                    <Badge variant="outline">{v.angle}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold">Hook</h4>
                    <p className="text-muted-foreground">{v.hook}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Body</h4>
                    <p className="whitespace-pre-wrap">{v.body}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">CTA</h4>
                    <p className="font-medium text-indigo-600">{v.cta}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Tono</h3>
                <p>{strategy.recommended_tone || campaign.tone || '-'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Llamada a la Acción (General)</h3>
                <p>{strategy.recommended_cta || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Creative Briefs ({campaign.briefs.length})</CardTitle>
                <Link href="/creatives" className="text-xs text-indigo-600 hover:underline">
                  Ver galería →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Cost Control & Model Transparency Box */}
              <div className="bg-muted/50 p-3 rounded-lg border text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Proveedor: {preflight.provider}</span>
                  <span>Modelo: {preflight.model}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dimensiones: {preflight.size} ({preflight.aspectRatio})</span>
                  <span className="font-semibold text-emerald-600">Est. ~${preflight.estimatedCost} USD</span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-muted">
                  {preflight.costNote}
                </p>
              </div>

              {campaign.briefs.map((b: Record<string, string>, i: number) => (
                <div key={b.id} className="border-b pb-4 last:border-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Concepto {i + 1}</h4>
                    {b.product_focus && (
                      <Badge variant="outline" className="text-[10px]">{b.product_focus}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{b.visual_concept}</p>
                  
                  {/* Previsualización de imágenes generadas para este brief */}
                  {Array.isArray((b as Record<string, unknown>).creatives) && ((b as Record<string, unknown>).creatives as unknown[]).length > 0 && (
                    <div className="space-y-2 pt-2">
                      {((b as Record<string, unknown>).creatives as Record<string, unknown>[]).map((c) => (
                        <div key={c.id as string} className="rounded-lg overflow-hidden border bg-muted/20 p-2 space-y-2">
                          <div className="relative aspect-square w-full rounded-md overflow-hidden bg-black/5">
                            {c.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={c.image_url as string} 
                                alt={b.visual_concept || "Creativo generado"} 
                                className="object-cover w-full h-full hover:scale-105 transition-transform duration-300" 
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                Sin previsualización
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              <Badge variant={c.status === 'Approved' ? 'default' : 'secondary'} className="text-[10px] shadow-sm">
                                {(c.status as string) || 'Listo'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-muted-foreground px-0.5">
                            <span>{(c.aspect_ratio as string) || '1:1'} • {(c.model as string)}</span>
                            <Link href={`/creatives/${c.id}`} className="text-indigo-600 font-medium hover:underline">
                              Ver detalle →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <GenerateImageButton
                    campaignId={campaign.id}
                    briefId={b.id}
                    estimatedCost={preflight.estimatedCost}
                    initialGeneratedCount={Array.isArray((b as Record<string, unknown>).creatives) ? ((b as Record<string, unknown>).creatives as unknown[]).length : 0}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <QueueGenerator campaignId={campaign.id} />
    </div>
  );
}
