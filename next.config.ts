import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next.js 16 bloquea por defecto, en `next dev`, cualquier request
   * cross-origin a sus recursos internos (`/_next/static/*`, HMR,
   * RSC) cuyo Origin/Referer no sea "localhost"/"*.localhost" ni el
   * hostname con el que arrancó el servidor. Acceder por la IP de la
   * LAN (ej. http://192.168.0.93:3000) cae fuera de esa allowlist: el
   * HTML inicial (con el logo) sí se sirve, pero los chunks de React
   * que hidratan la app quedan bloqueados con 403 — por eso solo se ve
   * el logo. `allowedDevOrigins` es la única forma soportada de sumar
   * un origen a esa allowlist; el wildcard cubre toda la subred para
   * no romper esto si el DHCP reasigna la IP.
   * https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: ["192.168.0.93", "192.168.0.*"],
};

export default nextConfig;
