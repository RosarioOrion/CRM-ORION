# Plan y acuerdos de Orion

Este archivo guarda lo que Rosario fue decidiendo, lo que quedó pendiente y
el plan del tutorial. **Leelo antes de trabajar en Orion** y actualizalo
cuando cambie algo.

## Quién y cómo

- **Orion Propiedades** es una inmobiliaria de Uruguay. **Rosario** es la CEO y fundadora.
- Responderle en **español rioplatense**, claro y sin tecnicismos.
- En las decisiones del equipo participan **César** y **Huillen**.
- Forma de trabajo:
  1. Cada pedido se hace en la rama de la sesión.
  2. Se prueba localmente (Postgres + `next build` / `next start` + Playwright).
  3. Se abre un PR a `main` y se hace squash-merge. Rosario pidió que lo haga Claude ("hacelo vos").
- Desde la sesión en la nube **no se puede entrar a producción** (Railway). Por eso:
  - cada PR aclara "No probado en producción";
  - a Rosario se le dice cómo verificarlo ella.

## Decisiones vigentes

### Roles y permisos (`src/lib/permisos.ts`)

- Los roles son **CEO**, **Administrador**, **Líder** y **Agente**.
- Cada usuario ve su propio rol y a la gente que tiene debajo (`equipoVisible`). La jerarquía sale de `usuarios.teamLeaderId` ("Responsable").
- Solo la CEO puede:
  - aprobar usuarios, cambiar roles o responsables y eliminar usuarios;
  - entrar a Ajustes y editar contenido;
  - editar comisiones a mano;
  - usar "Entrar como".
- El Administrador ve los contactos solo de su equipo.
- **Entrar como**: lo que se hace queda a nombre del usuario y se marca en Actividad como "hecho por Rosario (Entrar como)".

### Comisiones (`src/lib/comisiones.ts`)

- **Escala automática de agentes** (según facturación acumulada):

  | Nivel | Desde | Comisión |
  |---|---|---|
  | Agente | USD 0 | 40 % |
  | Asesor | USD 10.000 | 45 % |
  | Ejecutivo | USD 20.000 | 50 % |

- **Reparto PROVISORIO** (constantes `PORCENTAJE_*`):

  | Parte | % |
  |---|---|
  | Agente | 40 (o según su nivel) |
  | Gastos de la empresa | 10 (fijo, línea sin beneficiario) |
  | Líder | 20 |
  | Administrador | 15 |
  | CEO | 15 |

- La pantalla Comisiones muestra:
  - "Mis comisiones" por separado;
  - un resumen por usuario con buscador por nombre;
  - el detalle de cada persona;
  - los "Gastos de la empresa" (solo la CEO).

### Actividad (`src/lib/registro-actividad.ts`, `/actividad`)

- Las acciones importantes llaman a `registrar()`.
- La CEO ve a todos y Líder/Admin solo a su equipo. Los agentes no tienen acceso.
- **Si se agrega una acción nueva importante, registrarla también.**

## Pendientes

1. **Porcentajes finales de comisiones.** Rosario los define después de la reunión con César y Huillen.
   - Problema a resolver: con un agente en 45 % o 50 %, el reparto provisorio suma **105 % / 110 %**.
   - Hay que acordar de dónde sale la diferencia.
   - Se cambia en las constantes de `src/lib/comisiones.ts`.
2. **Tutorial del CRM** (ver abajo). Se hace cuando Rosario diga que la primera etapa de Orion está cerrada.

## Plan del tutorial (acordado con Rosario)

Objetivo: que Rosario **no tenga que grabar nada**. Por ahora, **todo gratis**.

### Etapa 1 (cuando Rosario dé por cerrada la primera etapa)

1. **Manual en PDF** con capturas reales, paso a paso.
   - Separado por rol: **Agente** y **Líder / Administrador / CEO**.
   - Pensado también para mandar por WhatsApp a un agente nuevo.
2. **Videos cortos (2–3 min) con subtítulos, sin voz.**
   - Se graban solos con Playwright (`recordVideo`) mientras Orion se usa automáticamente.
   - Llevan flechas o resaltados de dónde tocar.
   - Los subtítulos se queman en el video (ffmpeg o un cartel superpuesto en la página).
3. Temas sugeridos, uno por video y capítulo:
   1. Primer ingreso e Inicio (Plan del día, Objetivo del mes, Mis propiedades)
   2. Contactos: cargar, roles, seguimiento, contacto frío
   3. Captar: verificar teléfono → captación → pasar a propiedad
   4. Propiedades y Pipeline (seguimiento del lunes, ajuste de precio)
   5. Agenda y visitas
   6. Búsquedas, coincidencias y consultas
   7. Reservas y comisiones (escala)
   8. Solo jefes: equipo, Comisiones por usuario, Actividad, Usuarios, "Entrar como" (CEO)

### Reglas

- **Siempre con datos de prueba inventados**, en una base local. Nunca datos ni clientes reales.
- Grabar desde la versión actual de Orion. Si una pantalla cambia, se regenera ese video o capítulo.

### Etapa 2 (más adelante)

- Cada mejora nueva se anuncia en **Novedades** (`/novedades`) con un mini tutorial: 2–3 capturas o un video corto.
- Cuando Rosario pueda pagar complementos:
  - **voz natural rioplatense** en los videos (servicio pago tipo ElevenLabs; la clave se pide con el formulario seguro, nunca por chat);
  - **guía dentro de Orion**: cartelitos la primera vez que entra un usuario y un botón "Ver tutorial".
