// Se ejecuta una vez al arrancar el servidor de Next.js.
// Acá se inicia el chequeo de recordatorios (cada minuto), que manda las
// notificaciones al celular 1 hora antes de cada actividad de la Agenda.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { iniciarRecordatorios } = await import("./lib/recordatorios");
    iniciarRecordatorios();
  }
}
