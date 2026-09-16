import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La app valida hasta 5MB por foto y permite subir varias juntas
      // (input "multiple"), así que el límite del body tiene que cubrir
      // esa suma + el overhead de multipart/form-data. Por defecto
      // Next.js limita el body de un Server Action a 1MB, lo que hacía
      // fallar cualquier subida de fotos.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
