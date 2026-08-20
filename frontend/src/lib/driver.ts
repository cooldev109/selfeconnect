import { api } from "./api";
import type { Driver } from "@/hooks/useDriver";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

// Add one work-gallery photo (multipart). Returns the updated driver.
export async function addGalleryPhoto(file: File): Promise<Driver> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_BASE}/me/gallery`, {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!res.ok) throw new Error("upload_failed");
  return res.json();
}

export const removeGalleryPhoto = (url: string) =>
  api<Driver>("/me/gallery/remove", { method: "POST", body: JSON.stringify({ url }) });

export function updateMe(input: {
  name?: string;
  company?: string;
  phone?: string;
  tagline?: string;
  city?: string;
  bio?: string;
  postcode?: string;
  categorySlugs?: string[];
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
}) {
  return api<Driver>("/me", { method: "PATCH", body: JSON.stringify(input) });
}

export async function uploadPhoto(file: File): Promise<Driver> {
  const body = new FormData();
  body.append("file", file);
  // Note: no JSON Content-Type — let the browser set the multipart boundary.
  const res = await fetch(
    `${import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1"}/me/photo`,
    { method: "POST", credentials: "include", body },
  );
  if (!res.ok) throw new Error("upload_failed");
  return res.json();
}
