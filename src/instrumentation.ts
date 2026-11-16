// Se ejecuta una vez al arrancar el servidor de Next.js.
// Acá se inicia el chequeo de recordatorios (cada minuto), que manda las
// notificaciones al celular 1 hora antes de cada actividad de la Agenda.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Primero, cambios de base de datos pendientes (ej. roles de contactos).
    const { autoMigrar } = await import("./lib/auto-migrar");
    await autoMigrar();
    // Capacitación: número, bloque y áreas de los materiales que no los tienen.
    const { completarIndiceCapacitacion } = await import("./lib/manual-indice-datos");
    await completarIndiceCapacitacion().catch((e) => console.error("[capacitacion] índice", e));
    // Buscador: extrae en segundo plano el texto de los PDF que todavía no lo tienen.
    const { indexarPendientes } = await import("./lib/capacitacion-texto");
    setTimeout(() => {
      indexarPendientes()
        .then((n) => n && console.log(`[capacitacion] texto extraído de ${n} material(es)`))
        .catch((e) => console.error("[capacitacion] texto", e));
    }, 20_000);

    const { iniciarRecordatorios } = await import("./lib/recordatorios");
    iniciarRecordatorios();
    // Papelera: borrar definitivamente lo que pasó los 30 días (cada 6 horas).
    const { vaciarVencidos } = await import("./lib/papelera");
    const vaciar = () => vaciarVencidos().catch(() => {});
    setTimeout(vaciar, 60_000);
    setInterval(vaciar, 6 * 3600_000);
    // Captaciones: plazos de 48 hs, S8 y S12 (lo vencido va a la Papelera).
    const { vencerCaptaciones } = await import("./lib/captacion-borrar");
    const vencer = () => vencerCaptaciones().catch((e) => console.error("[captaciones]", e));
    setTimeout(vencer, 90_000);
    setInterval(vencer, 15 * 60_000);
  }
}
