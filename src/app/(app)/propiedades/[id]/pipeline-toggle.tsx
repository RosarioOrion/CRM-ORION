"use client";

import { useState } from "react";
import { TarjetaPipeline, type TarjetaPipelineProps } from "../../pipeline/tarjeta-pipeline";

export type { TarjetaPipelineProps };

export function PipelineToggle(props: TarjetaPipelineProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        📊 {abierto ? "Ocultar pipeline" : "Ver pipeline de esta propiedad"}
      </button>

      {abierto && (
        <div className="mt-3">
          <TarjetaPipeline {...props} />
        </div>
      )}
    </div>
  );
}
