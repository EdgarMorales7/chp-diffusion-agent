import { getGroupById, getGroupCategories, updateGroup } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default async function EditGroupPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [group, categories] = await Promise.all([
    getGroupById(params.id),
    getGroupCategories()
  ]);

  if (!group) {
    notFound();
  }

  // Bind the action to pass the group ID
  const updateGroupWithId = updateGroup.bind(null, group.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/groups/${group.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Editar Grupo</h1>
      </div>

      <form action={updateGroupWithId} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Grupo *</Label>
            <Input id="name" name="name" required defaultValue={group.name} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="facebook_url">URL de Facebook *</Label>
            <Input id="facebook_url" name="facebook_url" type="url" required defaultValue={group.facebook_url} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category_id">Categoría</Label>
              <Select name="category_id" defaultValue={group.category_id || "null"}>
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
              <Input id="location" name="location" defaultValue={group.location || ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="approximate_member_count">Miembros Aprox.</Label>
              <Input id="approximate_member_count" name="approximate_member_count" type="number" defaultValue={group.approximate_member_count || ''} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select name="status" defaultValue={group.status || "Pending Review"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Activo</SelectItem>
                  <SelectItem value="Pending Review">Pendiente de Revisión</SelectItem>
                  <SelectItem value="Restricted">Restringido</SelectItem>
                  <SelectItem value="No Advertising">Sin Publicidad</SelectItem>
                  <SelectItem value="Archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas Internas</Label>
            <Textarea id="notes" name="notes" defaultValue={group.notes || ''} />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/groups/${group.id}`}>
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </div>
  );
}
