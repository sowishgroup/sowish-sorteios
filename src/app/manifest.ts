import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sowish Sorteios",
    short_name: "Sowish",
    description: "Plataforma de sorteios para Instagram by Sowish Group",
    start_url: "/",
    display: "standalone",
    lang: "pt-BR",
    background_color: "#0b2d68",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

