import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FORJA — El sistema operativo de tu evolución",
    short_name: "FORJA",
    description: "Todo se forja: el cuerpo, la mente, el carácter, los hábitos, la disciplina.",
    start_url: "/hoy",
    display: "standalone",
    background_color: "#17140F",
    theme_color: "#17140F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
