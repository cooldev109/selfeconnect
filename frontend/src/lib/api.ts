const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(
      (body as { error?: string; message?: string })?.error ??
        (body as { message?: string })?.message ??
        `HTTP ${status}`,
    );
    this.status = status;
    this.body = body;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
