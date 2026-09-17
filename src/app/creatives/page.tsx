export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCreatives } from "./actions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

export default async function CreativesGalleryPage() {
  const creatives = await getCreatives();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Librería de Creativos</h1>
      </div>

      {creatives.length === 0 ? (
        <div className="text-center py-12 border rounded-xl border-dashed">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No hay creativos generados</h3>
          <p className="text-muted-foreground">Genera imágenes desde las Campañas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {creatives.map((c: any) => (
            <Link key={c.id} href={`/creatives/${c.id}`}>
              <Card className="overflow-hidden hover:ring-2 ring-indigo-500 transition-all cursor-pointer">
                <div className="aspect-square relative bg-muted flex items-center justify-center">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt="Creative" className="object-cover w-full h-full" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={c.status === 'Approved' ? 'default' : 'secondary'}>
                      {c.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground truncate">{c.campaigns?.name}</p>
                  <p className="text-sm font-medium mt-1 truncate">{c.aspect_ratio || '1:1'} - {c.model}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
