export const dynamic = 'force-dynamic';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/server";
import { isTaskForToday } from "@/lib/queue/status";

export default async function Home() {
  const supabase = createAdminClient();

  // Safely fetch real dashboard metrics
  let todayTasksCount = 0;
  let activeGroupsCount = 0;
  let activeCampaignsCount = 0;

  try {
    const { data: queueData } = await supabase.from('publication_queue').select('scheduled_for');
    if (queueData) {
      todayTasksCount = queueData.filter(t => isTaskForToday(t.scheduled_for)).length;
    }

    const { count: groupsCount } = await supabase.from('groups').select('*', { count: 'exact', head: true });
    if (groupsCount !== null) activeGroupsCount = groupsCount;

    const { count: campaignsCount } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
    if (campaignsCount !== null) activeCampaignsCount = campaignsCount;
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Publicaciones (Hoy)</h3>
          </div>
          <div className="text-3xl font-bold">{todayTasksCount}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Grupos Registrados</h3>
          </div>
          <div className="text-3xl font-bold">{activeGroupsCount}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Campañas</h3>
          </div>
          <div className="text-3xl font-bold">{activeCampaignsCount}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="font-semibold leading-none tracking-tight text-lg">Acciones Rápidas</h3>
        </div>
        <div className="p-6 flex flex-wrap gap-4">
          <Link href="/campaigns/new">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
              Generar Campaña con IA
            </Button>
          </Link>
          <Link href="/queue">
            <Button size="lg" variant="outline" className="font-medium">
              Ver Cola de Trabajo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
