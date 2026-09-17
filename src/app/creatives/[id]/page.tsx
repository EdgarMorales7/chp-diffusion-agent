import { getCreativeById } from "../actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CreativeStatusActions } from "./CreativeStatusActions";

export default async function CreativePreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const creative = await getCreativeById(params.id);

  if (!creative) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/creatives">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Vista Previa del Creativo</h1>
        </div>

        <CreativeStatusActions 
          creativeId={creative.id} 
          initialStatus={creative.status} 
        />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Lado Izquierdo: Imagen */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {creative.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creative.image_url} alt="Creative" className="w-full h-auto object-cover" />
            ) : (
              <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
                Sin Imagen
              </div>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground bg-card p-4 rounded-xl border">
            <div>
              <p className="font-semibold text-foreground">Proveedor / Modelo</p>
              <p>{creative.provider} ({creative.model})</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Dimensiones / Ratio</p>
              <p>{creative.size || '1024x1024'} ({creative.aspect_ratio || '1:1'})</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Costo Estimado</p>
              <p className="font-medium text-foreground">
                ${creative.estimated_cost ?? creative.generation_cost ?? '0.00'} USD
              </p>
              <p className="text-[10px] text-muted-foreground">Estimación basada en tokens/tarifas estándar</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Uso Real (Tokens)</p>
              <p className="text-xs">
                {creative.actual_usage ? JSON.stringify(creative.actual_usage) : 'No reportado por API'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold text-foreground">Prompt Ejecutado</p>
              <p className="mt-1 text-xs line-clamp-3 bg-muted p-2 rounded">{creative.prompt}</p>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Simulación de Publicación */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Asociación con Publicación</h2>
          <p className="text-sm text-muted-foreground">
            En la FASE 5 podrás arrastrar este creativo a diferentes textos para publicarlos en Facebook. 
            Esta es una vista previa simulada usando la Campaña asociada.
          </p>

          <Card className="max-w-md mx-auto border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  CHP
                </div>
                <div>
                  <p className="font-bold text-sm">CHP Personalizados</p>
                  <p className="text-xs text-muted-foreground">Publicado justo ahora</p>
                </div>
              </div>
              <div className="text-sm space-y-2">
                <p>🔥 ¿Necesitas playeras para tu negocio sin pedir cientos de unidades? (Simulación de texto)</p>
                <p>En CHP personalizamos desde pocas piezas con la mejor calidad.</p>
                <p className="text-blue-600 font-medium">Cotiza por WhatsApp aquí 👇</p>
              </div>
              {creative.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creative.image_url} alt="Post preview" className="w-full h-auto rounded-md border" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
