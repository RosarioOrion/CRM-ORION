import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion, cerrarSesion, esAdmin } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { MenuLateral } from "@/components/menu-lateral";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/captaciones", label: "Captaciones", icon: "🚀" },
  { href: "/pipeline", label: "Pipeline", icon: "📊" },
  { href: "/contactos", label: "Contactos", icon: "👤" },
  { href: "/propiedades", label: "Propiedades", icon: "🏢" },
  { href: "/busquedas", label: "Búsquedas", icon: "🔍" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/coincidencias", label: "Coincidencias", icon: "🎯" },
  { href: "/reservas", label: "Reservas", icon: "🤝" },
  { href: "/comisiones", label: "Comisiones", icon: "💵" },
  { href: "/novedades", label: "Novedades", icon: "📢" },
  { href: "/kaizen", label: "Kaizen 5S", icon: "🧹" },
  { href: "/ranking", label: "Ranking", icon: "🏆" },
  { href: "/capacitacion", label: "Capacitación", icon: "📚" },
  { href: "/tasaciones", label: "Tasaciones", icon: "📐" },
];

const NAV_ADMIN = [
  { href: "/productividad", label: "Productividad", icon: "📈" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "🛡️" },
  { href: "/ajustes", label: "Ajustes", icon: "⚙️" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <MenuLateral>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orion-gold text-orion-navy text-sm font-bold">
            O
          </div>
          <span className="text-lg font-bold tracking-wide">ORION</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {esAdmin(sesion.rol) &&
            NAV_ADMIN.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-2">
          <ThemeToggle />
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <Link href="/perfil" className="block rounded-lg -mx-1 px-1 py-0.5 transition hover:bg-white/10">
            <p className="text-sm font-medium">{sesion.nombre}</p>
            <p className="text-xs text-white/50">{rolLegible(sesion.rol)}</p>
          </Link>
          <form action={cerrarYRedirigir}>
            <button
              type="submit"
              className="mt-3 text-xs text-orion-gold hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </MenuLateral>

      <main className="min-w-0 flex-1 bg-orion-bg pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}

function rolLegible(rol: string) {
  if (rol === "TEAM_LEADER") return "Team Leader";
  if (rol === "ADMINISTRADOR") return "Administrador";
  return "Agente";
}

async function cerrarYRedirigir() {
  "use server";
  await cerrarSesion();
  redirect("/login");
}
