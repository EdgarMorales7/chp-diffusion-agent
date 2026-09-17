import { Menu } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/20 px-4 lg:h-[60px] lg:px-6">
      <button className="md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <h1 className="font-semibold text-lg md:text-xl">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        {/* Placeholder para Perfil */}
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
          CH
        </div>
      </div>
    </header>
  );
}
