export const dynamic = 'force-dynamic';
import { getQueueTasks } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function CalendarPage() {
  const tasks = await getQueueTasks();

  // Basic grouped view by date (simple list for now, true interactive calendar can be built via robust libraries like react-big-calendar if needed)
  const groupedTasks: Record<string, typeof tasks> = {};

  tasks.forEach(t => {
    const d = new Date(t.scheduled_for).toLocaleDateString();
    if (!groupedTasks[d]) groupedTasks[d] = [];
    groupedTasks[d].push(t);
  });

  const sortedDates = Object.keys(groupedTasks).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/queue">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario de Publicaciones</h1>
          <p className="text-muted-foreground mt-1">
            Vista cronológica de las tareas programadas.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {sortedDates.map(dateStr => (
          <div key={dateStr} className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2 flex items-center gap-2">
              {dateStr}
              <Badge variant="secondary">{groupedTasks[dateStr].length}</Badge>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedTasks[dateStr].map(task => (
                <div key={task.id} className="border rounded-lg p-4 bg-card shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm line-clamp-1">{task.groups?.name}</span>
                    <Badge variant="outline">{new Date(task.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{task.campaigns?.name}</p>
                  
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <Badge variant={task.status === 'Published' ? 'default' : 'secondary'}>{task.status}</Badge>
                    <Link href={`/queue/prepare/${task.id}`}>
                      <Button variant="link" size="sm" className="h-auto p-0">Ver detalle</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {sortedDates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay publicaciones programadas.
          </div>
        )}
      </div>
    </div>
  );
}
