export const dynamic = 'force-dynamic';
import { getQueueTasks } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Calendar, Play, CheckCircle, SkipForward } from "lucide-react";
import { 
  isTaskForToday, 
  isTaskOverdueOrToday, 
  isActionableStatus, 
  PRIORITY_WEIGHTS 
} from "@/lib/queue/status";

export default async function QueuePage() {
  const tasks = await getQueueTasks();

  // Tasks published or skipped today
  const publishedToday = tasks.filter(t => t.status === 'Published' && isTaskForToday(t.scheduled_for));
  const skippedToday = tasks.filter(t => (t.status === 'Skipped' || t.status === 'Cancelled') && isTaskForToday(t.scheduled_for));
  
  // Actionable tasks for today (Today, Approved, Ready, Planned) with scheduled_for <= todayEnd
  const actionableToday = tasks.filter(t => isActionableStatus(t.status) && isTaskOverdueOrToday(t.scheduled_for));

  // Sort by real priority: High(3) > Medium(2) > Low(1), then scheduled_for ASC
  actionableToday.sort((a, b) => {
    const pA = PRIORITY_WEIGHTS[a.priority] || 0;
    const pB = PRIORITY_WEIGHTS[b.priority] || 0;
    if (pA !== pB) return pB - pA;
    return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
  });

  const processedIds = new Set([
    ...publishedToday.map(t => t.id),
    ...skippedToday.map(t => t.id),
    ...actionableToday.map(t => t.id)
  ]);

  const otherTasks = tasks.filter(t => !processedIds.has(t.id) && t.status !== 'Cancelled');
  
  const totalActionableToday = actionableToday.length + publishedToday.length + skippedToday.length;
  const progressPercent = totalActionableToday > 0 
    ? ((publishedToday.length + skippedToday.length) / totalActionableToday) * 100 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estación de Publicación</h1>
          <p className="text-muted-foreground mt-1">
            Human-in-the-Loop Facebook Publisher.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/queue/calendar">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" /> Calendario
            </Button>
          </Link>
          <Link href="/campaigns">
            <Button>Programar Nuevas</Button>
          </Link>
        </div>
      </div>

      <section className="space-y-4">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Progreso de Hoy</h2>
              <p className="text-sm text-muted-foreground">
                {publishedToday.length} publicadas, {skippedToday.length} omitidas de {totalActionableToday} tareas.
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5"><Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{actionableToday.length}</Badge> Pendientes</div>
              <div className="flex items-center gap-1.5"><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{publishedToday.length}</Badge> Publicadas</div>
              <div className="flex items-center gap-1.5"><Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{skippedToday.length}</Badge> Omitidas</div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        <div className="flex items-center gap-2 border-b pb-2 pt-4">
          <h2 className="text-xl font-bold text-indigo-700 uppercase tracking-wider">Cola de Publicación (Hoy)</h2>
        </div>

        {actionableToday.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground">No tienes tareas pendientes para publicar hoy.</p>
            {totalActionableToday > 0 && <p className="text-sm text-green-600 mt-2 font-medium">¡Has completado todas las tareas del día!</p>}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actionableToday.map(task => (
              <Card key={task.id} className="flex flex-col overflow-hidden border-indigo-100 shadow-sm transition-all hover:shadow-md">
                <div className={`h-2 w-full ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base line-clamp-1">{task.groups?.name || 'Grupo Desconocido'}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{task.campaigns?.name}</p>
                    </div>
                    <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="flex gap-3">
                    {task.creatives?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={task.creatives.image_url} alt="Preview" className="w-16 h-16 rounded-md object-cover border" />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground text-center px-1">Sin img</div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2 italic text-muted-foreground">
                        &quot;{task.post_variants?.hook || 'Sin copy'}&quot;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted p-2 rounded">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(task.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {task.status}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 pt-4">
                  <Link href={`/queue/prepare/${task.id}`} className="w-full">
                    <Button className="w-full gap-2" variant="default">
                      <Play className="h-4 w-4" /> Preparar y Publicar
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Tareas ya procesadas hoy */}
      {(publishedToday.length > 0 || skippedToday.length > 0) && (
        <section className="space-y-4 pt-6">
          <h3 className="text-lg font-bold text-slate-700">Completadas Hoy</h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {publishedToday.concat(skippedToday).map(task => (
              <Card key={task.id} className="bg-slate-50 border-slate-200">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium line-clamp-1">{task.groups?.name}</CardTitle>
                    {task.status === 'Published' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <SkipForward className="h-4 w-4 text-slate-400" />}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                   <p className="text-xs text-muted-foreground line-clamp-1">{task.campaigns?.name}</p>
                   {task.status === 'Published' && task.facebook_post_url && (
                     <a href={task.facebook_post_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Ver Post</a>
                   )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 pt-6">
        <h2 className="text-xl font-bold">Próximos Días ({otherTasks.length})</h2>
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Campaña</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {otherTasks.slice(0, 10).map(task => (
                <tr key={task.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">
                    {new Date(task.scheduled_for).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{task.groups?.name}</td>
                  <td className="px-4 py-3">{task.campaigns?.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{task.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/queue/prepare/${task.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {otherTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay publicaciones programadas para próximos días.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
