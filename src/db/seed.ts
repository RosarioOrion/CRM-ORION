import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { usuarios, contactos, propiedades } from "./schema";

async function main() {
  console.log("Sembrando datos de prueba para CRM Orion...");

  const passwordHash = await bcrypt.hash("orion2026", 10);

  const [rosario] = await db
    .insert(usuarios)
    .values({
      nombre: "Rosario Pereira",
      email: "rosario@crmorion.com",
      passwordHash,
      telefono: "097483100",
      rol: "TEAM_LEADER",
    })
    .returning();

  const [contacto1] = await db
    .insert(contactos)
    .values({
      nombre: "Juan Dueño (demo)",
      telefono: "099111222",
      email: "juan.demo@example.com",
      notas: "Contacto de ejemplo cargado por el sistema de siembra.",
      agenteId: rosario.id,
    })
    .returning();

  await db.insert(propiedades).values({
    codigo: "OR001",
    titulo: "Apartamento 2 dormitorios en Pocitos (demo)",
    operacion: "VENTA",
    tipo: "Apartamento",
    zona: "Montevideo — Pocitos",
    precio: 145000,
    moneda: "USD",
    estado: "ACTIVA",
    duenoId: contacto1.id,
    agenteId: rosario.id,
  });

  console.log("Listo. Usuario de prueba: rosario@crmorion.com / orion2026");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
