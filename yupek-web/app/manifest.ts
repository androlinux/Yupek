import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YUPEK — Eastern Heritage, European Style",
    short_name: "YUPEK",
    description:
      "Contemporary clothing inspired by Eastern heritage, designed for modern European living. Discover YUPEK collections, timeless pieces and Eastern-inspired style.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1E7",
    theme_color: "#2B1D14",
    icons: [
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
