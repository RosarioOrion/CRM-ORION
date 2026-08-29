import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "orion_session";
const secretKey = process.env.AUTH_SECRET || "dev-secret-change-me";
const key = new TextEncoder().encode(secretKey);

async function haySesionValida(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const autenticado = await haySesionValida(req);

  const esRutaProtegida =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/contactos") ||
    pathname.startsWith("/propiedades");

  if (esRutaProtegida && !autenticado) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && autenticado) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/contactos/:path*", "/propiedades/:path*", "/login"],
};
