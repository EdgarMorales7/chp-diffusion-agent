import Link from 'next/link';
import { Home, Users, Megaphone, Calendar, Image as ImageIcon, BarChart } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Grupos', href: '/groups', icon: Users },
  { name: 'Campañas', href: '/campaigns', icon: Megaphone },
  { name: 'Cola', href: '/queue', icon: Calendar },
  { name: 'Creativos', href: '/creatives', icon: ImageIcon },
  { name: 'Métricas', href: '/analytics', icon: BarChart },
];

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/20">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 font-bold text-lg">
        CHP Diffusion Agent
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
