import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion, cerrarSesion } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/contactos", label: "Contactos", icon: "👤" },
  { href: "/propiedades", label: "Propiedades", icon: "🏢" },
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
      <aside className="flex w-60 shrink-0 flex-col bg-orion-navy text-white">
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
        </nav>

        <div className="border-t border-white/10 px-3 py-2">
          <ThemeToggle />
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-sm font-medium">{sesion.nombre}</p>
          <p className="text-xs text-white/50">{rolLegible(sesion.rol)}</p>
          <form action={cerrarYRedirigir}>
            <button
              type="submit"
              className="mt-3 text-xs text-orion-gold hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-orion-bg">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
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
