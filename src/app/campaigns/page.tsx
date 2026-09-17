export const dynamic = 'force-dynamic';
import { getCampaigns } from "./actions";
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
import { Sparkles } from "lucide-react";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campañas</h1>
        <Link href="/campaigns/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Sparkles className="h-4 w-4" />
            Nueva Campaña con IA
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead>Audiencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No hay campañas generadas. Haz clic en &quot;Nueva Campaña con IA&quot; para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-xs truncate">{c.name}</TableCell>
                  <TableCell>{c.objective || '-'}</TableCell>
                  <TableCell>{c.audience || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'Ready' ? 'default' : 'secondary'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/campaigns/${c.id}`}>
                      <Button variant="ghost" size="sm">Ver Detalles</Button>
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
