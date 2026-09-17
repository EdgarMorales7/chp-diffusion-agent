export const dynamic = 'force-dynamic';
import { getGroupCategories, createGroup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewGroupPage() {
  const categories = await getGroupCategories();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/groups">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Añadir Grupo</h1>
      </div>

      <form action={createGroup} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Grupo *</Label>
            <Input id="name" name="name" required placeholder="Ej. Emprendedores CDMX" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="facebook_url">URL de Facebook *</Label>
            <Input id="facebook_url" name="facebook_url" type="url" required placeholder="https://facebook.com/groups/..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category_id">Categoría</Label>
              <Select name="category_id">
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Sin categoría</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" name="location" placeholder="Ciudad, País" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="approximate_member_count">Miembros Aprox.</Label>
              <Input id="approximate_member_count" name="approximate_member_count" type="number" placeholder="Ej. 15000" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Estado Inicial</Label>
              <Select name="status" defaultValue="Pending Review">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Activo</SelectItem>
                  <SelectItem value="Pending Review">Pendiente de Revisión</SelectItem>
                  <SelectItem value="Restricted">Restringido</SelectItem>
                  <SelectItem value="No Advertising">Sin Publicidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas Internas</Label>
            <Textarea id="notes" name="notes" placeholder="Cualquier información adicional útil..." />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/groups">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit">Guardar Grupo</Button>
        </div>
      </form>
    </div>
  );
}
