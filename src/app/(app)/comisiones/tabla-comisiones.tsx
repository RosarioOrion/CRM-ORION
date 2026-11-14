"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  agregarComision,
  editarComision,
  eliminarComision,
  marcarComisionPagada,
  type DatosComision,
} from "./actions";

type Comision = {
  id: string;
  concepto: string;
  porcentaje: number;
  monto: number;
  pagada: boolean;
  beneficiarioNombre: string;
  beneficiarioId: string | null;
  /** Línea de gastos de la empresa (sin beneficiario). */
  esGasto: boolean;
  propiedadNombre: string;
  tipoOperacion: "VENTA" | "ALQUILER";
  creadoEn: string;
};

type Opcion = { id: string; nombre: string };

const control =
  "rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white";

/**
 * Tabla de comisiones. La CEO (`esAdmin`) además marca cobradas y puede
 * editarlas, eliminarlas o agregar líneas a mano (cambios, operaciones
 * compartidas, etc.).
 */
export function TablaComisiones({
  comisiones,
  esAdmin,
  usuarios = [],
  operaciones = [],
}: {
  comisiones: Comision[];
  esAdmin: boolean;
  usuarios?: Opcion[];
  operaciones?: Opcion[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function guardar(id: string, d: DatosComision) {
    setError(null);
    startTransition(async () => {
      const r = await editarComision(id, d);
      if (r.error) return setError(r.error);
      setEditando(null);
      router.refresh();
    });
  }

  function eliminar(c: Comision) {
    if (!window.confirm(`¿Eliminar la comisión de ${c.beneficiarioNombre} (USD ${c.monto.toLocaleString("es-UY")})?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await eliminarComision(c.id);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }
  const [pagadas, setPagadas] = useState<Record<string, boolean>>(
    Object.fromEntries(comisiones.map((c) => [c.id, c.pagada]))
  );

  function toggle(id: string, pagada: boolean) {
    setPagadas((p) => ({ ...p, [id]: pagada }));
    startTransition(() => {
      marcarComisionPagada(id, pagada);
    });
  }

  const agregar = esAdmin && operaciones.length > 0 && (
    <AgregarComision usuarios={usuarios} operaciones={operaciones} onListo={() => router.refresh()} />
  );

  if (comisiones.length === 0) {
    return (
      <div>
        {agregar}
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          Todavía no hay comisiones. Se generan automáticamente al cerrar reservas.
        </p>
      </div>
    );
  }

  return (
    <div>
    {agregar}
    {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Propiedad</th>
            <th className="px-4 py-3 font-semibold">Beneficiario</th>
            <th className="px-4 py-3 font-semibold">Concepto</th>
            <th className="px-4 py-3 font-semibold text-right">Monto</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            {esAdmin && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {comisiones.map((c) => {
            const pagada = pagadas[c.id];
            if (editando === c.id) {
              return (
                <FilaEdicion
                  key={c.id}
                  c={c}
                  usuarios={usuarios}
                  onGuardar={(d) => guardar(c.id, d)}
                  onCancelar={() => setEditando(null)}
                />
              );
            }
            return (
              <tr key={c.id} className="border-b border-gray-100 last:border-0 dark:border-gray-700">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {c.propiedadNombre}
                  <span className="ml-1 text-[10px] text-gray-400">
                    ({c.tipoOperacion === "VENTA" ? "Venta" : "Alquiler"})
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {c.beneficiarioNombre}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {c.concepto}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-orion-navy dark:text-white">
                  USD {c.monto.toLocaleString("es-UY")}
                </td>
                <td className="px-4 py-3">
                  {c.esGasto ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      Fondo de gastos
                    </span>
                  ) : esAdmin ? (
                    <button
                      type="button"
                      onClick={() => toggle(c.id, !pagada)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                        pagada
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}
                    >
                      {pagada ? "✓ Cobrado" : "Pendiente"}
                    </button>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        pagada
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}
                    >
                      {pagada ? "✓ Cobrado" : "Pendiente"}
                    </span>
                  )}
                </td>
                {esAdmin && (
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    <button type="button" onClick={() => setEditando(c.id)} className="text-orion-navy hover:underline dark:text-orion-gold">
                      Editar
                    </button>
                    <button type="button" onClick={() => eliminar(c)} className="ml-3 text-gray-400 hover:text-red-600">
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}

function CamposComision({
  usuarios,
  d,
  set,
}: {
  usuarios: Opcion[];
  d: DatosComision;
  set: (d: DatosComision) => void;
}) {
  return (
    <>
      <select
        value={d.beneficiarioId ?? ""}
        onChange={(e) => set({ ...d, beneficiarioId: e.target.value || null })}
        className={control}
        aria-label="Beneficiario"
      >
        <option value="">🏢 Empresa / gastos</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre}
          </option>
        ))}
      </select>
      <input
        value={d.concepto}
        onChange={(e) => set({ ...d, concepto: e.target.value })}
        placeholder="Concepto (ej. Compartida con…)"
        className={`${control} min-w-40`}
        aria-label="Concepto"
      />
      <input
        type="number"
        value={d.porcentaje}
        onChange={(e) => set({ ...d, porcentaje: Number(e.target.value) })}
        className={`${control} w-16`}
        aria-label="Porcentaje"
        title="%"
      />
      <input
        type="number"
        value={d.monto}
        onChange={(e) => set({ ...d, monto: Number(e.target.value) })}
        className={`${control} w-24`}
        aria-label="Monto USD"
        title="USD"
      />
    </>
  );
}

function FilaEdicion({
  c,
  usuarios,
  onGuardar,
  onCancelar,
}: {
  c: Comision;
  usuarios: Opcion[];
  onGuardar: (d: DatosComision) => void;
  onCancelar: () => void;
}) {
  const [d, setD] = useState<DatosComision>({
    beneficiarioId: c.beneficiarioId,
    concepto: c.concepto,
    porcentaje: c.porcentaje,
    monto: c.monto,
  });
  return (
    <tr className="border-b border-gray-100 bg-amber-50/60 last:border-0 dark:border-gray-700 dark:bg-amber-900/10">
      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{c.propiedadNombre}</td>
      <td colSpan={5} className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <CamposComision usuarios={usuarios} d={d} set={setD} />
          <span className="text-[11px] text-gray-400">% · USD</span>
          <button type="button" onClick={() => onGuardar(d)} className="rounded bg-orion-navy px-3 py-1 text-xs font-semibold text-white">
            Guardar
          </button>
          <button type="button" onClick={onCancelar} className="text-xs text-gray-500 hover:underline">
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}

function AgregarComision({
  usuarios,
  operaciones,
  onListo,
}: {
  usuarios: Opcion[];
  operaciones: Opcion[];
  onListo: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [operacion, setOperacion] = useState("");
  const [d, setD] = useState<DatosComision>({ beneficiarioId: null, concepto: "", porcentaje: 0, monto: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mb-3 rounded-lg border border-orion-navy/30 px-3 py-1.5 text-xs font-semibold text-orion-navy hover:bg-orion-navy/5 dark:text-orion-gold"
      >
        + Agregar comisión a mano
      </button>
    );
  }
  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Para operaciones compartidas o ajustes. Solo vos podés agregar, editar o eliminar comisiones.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={operacion} onChange={(e) => setOperacion(e.target.value)} className={control} aria-label="Operación">
          <option value="">Operación…</option>
          {operaciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
        <CamposComision usuarios={usuarios} d={d} set={setD} />
        <button
          type="button"
          disabled={pending || !operacion}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await agregarComision(operacion, d);
              if (r.error) return setError(r.error);
              setAbierto(false);
              setD({ beneficiarioId: null, concepto: "", porcentaje: 0, monto: 0 });
              onListo();
            })
          }
          className="rounded bg-orion-navy px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Agregar"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-xs text-gray-500 hover:underline">
          Cancelar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
