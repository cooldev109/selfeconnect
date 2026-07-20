import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Eye, EyeOff } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Services — SelfeConnect Admin" },
      { name: "description", content: "Manage the service categories professionals can offer." },
    ],
  }),
  component: AdminCategories,
});

interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  jobCount: number;
  professionalCount: number;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function AdminCategories() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api<AdminCategory[]>("/admin/categories"),
    retry: false,
  });
  const categories = data ?? [];

  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] }); // the public picker
  };
  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setName("");
    setSlug("");
    setError(null);
  };

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api(`/admin/categories/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: name.trim() }),
          })
        : api("/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
          }),
    onSuccess: () => {
      refresh();
      closeForm();
    },
    onError: (e) =>
      setError(
        e instanceof ApiError && e.status === 409
          ? "A service with that name or slug already exists."
          : "Couldn't save. Check the name and slug and try again.",
      ),
  });

  const toggle = useMutation({
    mutationFn: (c: AdminCategory) =>
      api(`/admin/categories/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !c.active }),
      }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      setToDelete(null);
    },
    onError: () =>
      setError("This service is in use and can't be deleted — hide it instead."),
  });

  const openCreate = () => {
    closeForm();
    setCreating(true);
  };
  const openEdit = (c: AdminCategory) => {
    closeForm();
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
  };

  const activeCount = categories.filter((c) => c.active).length;

  return (
    <>
      <AdminList<AdminCategory>
        title="Services"
        subtitle="The trades professionals can offer and customers can search for."
        rows={categories}
        searchOf={(c) => `${c.name} ${c.slug}`}
        searchPlaceholder="Search services…"
        emptyText="No services yet."
        pageSize={15}
        stats={[
          { label: "Active services", value: activeCount, accent: true },
          { label: "Hidden", value: categories.length - activeCount },
          {
            label: "Professionals listed",
            value: categories.reduce((s, c) => s + c.professionalCount, 0),
          },
          { label: "Jobs posted", value: categories.reduce((s, c) => s + c.jobCount, 0) },
        ]}
        filters={
          <Button
            onClick={openCreate}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add service
          </Button>
        }
        head={
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead className="text-right">Professionals</TableHead>
            <TableHead className="text-right">Jobs</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        }
        row={(c) => (
          <TableRow key={c.id}>
            <TableCell className="text-sm font-medium text-foreground">{c.name}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
            <TableCell className="text-right text-sm tabular-nums text-foreground">
              {c.professionalCount}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-foreground">
              {c.jobCount}
            </TableCell>
            <TableCell>
              <Badge
                className={`rounded-full text-[10px] uppercase tracking-wide ${
                  c.active
                    ? "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]"
                    : "bg-muted text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.active ? "Live" : "Hidden"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  className="rounded-lg"
                  title={c.active ? "Hide from customers" : "Show to customers"}
                  onClick={() => toggle.mutate(c)}
                >
                  {c.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" className="rounded-lg" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setError(null);
                    setToDelete(c);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      {/* Add / edit */}
      <Modal
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) closeForm(); }}
        title={editing ? "Edit service" : "Add a service"}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Name</span>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editing) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Locksmith"
              maxLength={60}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Slug{" "}
              <span className="font-normal text-muted-foreground">
                (used in web addresses)
              </span>
            </span>
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="locksmith"
              maxLength={60}
              disabled={!!editing}
            />
            {editing && (
              <span className="mt-1 block text-xs text-muted-foreground">
                The slug can't be changed once a service is in use.
              </span>
            )}
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={save.isPending || name.trim().length < 2 || !slug}
              onClick={() => {
                setError(null);
                save.mutate();
              }}
            >
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Add service"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }} title="Delete service?">
        <p className="text-sm text-muted-foreground">
          Remove <strong>{toDelete?.name}</strong>? If professionals or jobs use
          it, hide it instead so existing listings keep working.
        </p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={remove.isPending}
            onClick={() => toDelete && remove.mutate(toDelete.id)}
          >
            {remove.isPending ? "Deleting…" : "Delete service"}
          </Button>
        </div>
      </Modal>

      {/* Keeps the card grid spacing consistent when the list is empty */}
      {categories.length === 0 && (
        <Card className="mx-auto mt-6 max-w-7xl rounded-2xl">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading services…
          </CardContent>
        </Card>
      )}
    </>
  );
}
