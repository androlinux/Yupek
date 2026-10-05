import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YUPEK Amsterdam",
    short_name: "YUPEK",
    description: "Contemporary architectural clothing inspired by ancient Turkmen silk heritage, tailored for modern European living.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1E7",
    theme_color: "#2B1D14",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
