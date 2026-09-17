export const dynamic = 'force-dynamic';
import { getGroupById } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Settings, Plus } from "lucide-react";
import { notFound } from "next/navigation";

export default async function GroupDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const group = await getGroupById(params.id);

  if (!group) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/groups">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <Badge variant={group.status === 'Active' ? 'default' : 'secondary'}>
            {group.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <a href={group.facebook_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir Grupo
            </Button>
          </a>
          <Link href={`/groups/${group.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Información General</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Categoría</dt>
                <dd className="font-medium">{(group.group_categories as unknown as { name: string })?.name || 'Sin Categoría'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ubicación</dt>
                <dd className="font-medium">{group.location || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Miembros Aprox.</dt>
                <dd className="font-medium">{group.approximate_member_count?.toLocaleString() || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Actividad</dt>
                <dd className="font-medium">{group.activity_level || 'Desconocida'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-card p-6 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Reglas del Grupo</h2>
              <Button variant="ghost" size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Nueva
              </Button>
            </div>
            <div className="text-sm text-muted-foreground text-center py-4">
              No hay reglas registradas aún.
            </div>
            {/* TODO: Mostrar lista de reglas mapeadas desde group_rules */}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Opportunity Score</h2>
            <div className="text-4xl font-bold text-primary mb-2">
              {group.opportunity_score || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Calculado en base a relevancia y permisividad publicitaria.
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Acciones</h2>
            <div className="grid gap-2">
              <Button className="w-full" variant="secondary">Registrar Publicación</Button>
              <Button className="w-full" variant="outline">Ver Historial</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
