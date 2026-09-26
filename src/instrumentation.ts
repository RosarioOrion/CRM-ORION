// Se ejecuta una vez al arrancar el servidor de Next.js.
// Acá se inicia el chequeo de recordatorios (cada minuto), que manda las
// notificaciones al celular 1 hora antes de cada actividad de la Agenda.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Primero, cambios de base de datos pendientes (ej. roles de contactos).
    const { autoMigrar } = await import("./lib/auto-migrar");
    await autoMigrar();

    const { iniciarRecordatorios } = await import("./lib/recordatorios");
    iniciarRecordatorios();
    // Papelera: borrar definitivamente lo que pasó los 30 días (cada 6 horas).
    const { vaciarVencidos } = await import("./lib/papelera");
    const vaciar = () => vaciarVencidos().catch(() => {});
    setTimeout(vaciar, 60_000);
    setInterval(vaciar, 6 * 3600_000);
  }
}
