import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion, cerrarSesion } from "@/lib/auth";
import { esCEO, esSupervisor, ROL_LABEL } from "@/lib/permisos";
import { ThemeToggle } from "@/components/theme-toggle";
import { MenuLateral } from "@/components/menu-lateral";
import { AccionesRapidas } from "@/components/acciones-rapidas";
import { CompartirOrion } from "@/components/compartir-orion";
import { volverAMiUsuario } from "./admin/usuarios/entrar-como-actions";

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
  { href: "/finanzas", label: "Mis finanzas", icon: "💰" },
  { href: "/novedades", label: "Novedades", icon: "📢" },
  { href: "/kaizen", label: "Kaizen 5S", icon: "🧹" },
  { href: "/capacitacion", label: "Capacitación", icon: "📚" },
  { href: "/mensajes", label: "Mensajes WhatsApp", icon: "💬" },
  { href: "/tasaciones", label: "Tasaciones", icon: "📐" },
  { href: "/papelera", label: "Papelera", icon: "🗑️" },
];

// Productividad y Usuarios: CEO, Administrador y Líder (cada uno ve lo
// que le corresponde). Ajustes: solo la CEO.
const NAV_ADMIN = [
  { href: "/productividad", label: "Productividad", icon: "📈", soloCEO: false },
  { href: "/actividad", label: "Actividad", icon: "🕒", soloCEO: false },
  { href: "/admin/usuarios", label: "Usuarios", icon: "🛡️", soloCEO: false },
  { href: "/ajustes", label: "Ajustes", icon: "⚙️", soloCEO: true },
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
      <MenuLateral barraCelular={<AccionesRapidas compacto />}>
        <Link href="/dashboard" className="block border-b border-white/10 px-5 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/orion-logo.png" alt="Orion Propiedades" className="h-auto w-full max-w-[180px]" />
        </Link>

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
          {esSupervisor(sesion.rol) &&
            NAV_ADMIN.filter((item) => !item.soloCEO || esCEO(sesion.rol)).map((item) => (
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
          <CompartirOrion />
          <ThemeToggle />
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <Link href="/perfil" className="block rounded-lg -mx-1 px-1 py-0.5 transition hover:bg-white/10">
            <p className="text-sm font-medium">{sesion.nombre}</p>
            <p className="text-xs text-white/50">{ROL_LABEL[sesion.rol]}</p>
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
        {sesion.suplantadoPor && (
          // "Entrar como": siempre visible, para no olvidar en qué usuario se está.
          <div className="sticky top-14 z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950 md:top-0">
            <span>
              👁️ Estás usando Orion como {sesion.nombre} ({ROL_LABEL[sesion.rol]}). Lo que hagas queda a su nombre.
            </span>
            <form action={volverAMiUsuario}>
              <button type="submit" className="rounded-lg bg-amber-950 px-3 py-1 text-xs font-semibold text-white hover:bg-black">
                Volver a mi usuario
              </button>
            </form>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <div className="hidden md:block">
            <AccionesRapidas />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}


async function cerrarYRedirigir() {
  "use server";
  await cerrarSesion();
  redirect("/login");
}
