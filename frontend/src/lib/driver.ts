import { api } from "./api";
import type { Driver } from "@/hooks/useDriver";

export function updateMe(input: {
  name?: string;
  company?: string;
  phone?: string;
  tagline?: string;
  city?: string;
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
