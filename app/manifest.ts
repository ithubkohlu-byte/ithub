import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "IT HUB Kohlu",
    short_name: "IT HUB",
    description: "IT HUB Kohlu — admissions, student dashboard, results, roll slips and ID cards.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05070d",
    theme_color: "#05070d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Apply Now", url: "/apply", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Dashboard", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Result", url: "/result", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
