import { getGroups } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grupos de Facebook</h1>
        <Link href="/groups/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Nuevo Grupo
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Buscar grupo..." className="pl-8" />
        </div>
        {/* Aquí irían más filtros */}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No hay grupos registrados.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{g.name}</span>
                      {g.facebook_url && (
                        <a href={g.facebook_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                          Ver en Facebook
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{(g.group_categories as unknown as { name: string })?.name || 'Sin Categoría'}</TableCell>
                  <TableCell>{g.location || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{g.opportunity_score || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={g.status === 'Active' ? 'default' : 'secondary'}>
                      {g.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/groups/${g.id}`}>
                      <Button variant="ghost" size="sm">Detalles</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
