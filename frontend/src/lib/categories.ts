import { api } from "./api";

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

// Public list of active service categories (for registration + search filters).
export function getCategories() {
  return api<ServiceCategory[]>("/categories");
}
