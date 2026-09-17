import { createCampaignWizard } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Generador de Campaña</h1>
      </div>

      <form action={createCampaignWizard} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt">¿Qué quieres promocionar? *</Label>
            <Textarea 
              id="prompt" 
              name="prompt" 
              required 
              placeholder="Ej. Quiero promocionar playeras personalizadas para emprendedores." 
              className="h-24 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Select name="objective">
                <SelectTrigger>
                  <SelectValue placeholder="Dejar que la IA decida" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generar mensajes">Generar mensajes</SelectItem>
                  <SelectItem value="generar cotizaciones">Generar cotizaciones</SelectItem>
                  <SelectItem value="conseguir pedidos">Conseguir pedidos</SelectItem>
                  <SelectItem value="promocionar mayoreo">Promocionar mayoreo</SelectItem>
                  <SelectItem value="promocionar personalizacion">Promocionar personalización</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="audience">Público (Opcional)</Label>
              <Input id="audience" name="audience" placeholder="Ej. Emprendedores, PyMEs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product">Producto (Opcional)</Label>
              <Input id="product" name="product" placeholder="Ej. Playeras, Sudaderas" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tone">Tono (Opcional)</Label>
              <Input id="tone" name="tone" placeholder="Ej. Profesional, Cercano" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/campaigns">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Sparkles className="h-4 w-4" />
            Generar Campaña Completa
          </Button>
        </div>
      </form>
    </div>
  );
}
