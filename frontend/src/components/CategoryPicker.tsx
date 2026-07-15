import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Check, X, ChevronDown } from "lucide-react";
import { getCategories } from "@/lib/categories";

function useCategoryList() {
  const q = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  return (q.data ?? []) as { slug: string; name: string }[];
}

function match(name: string, query: string) {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

// Multi-select: a type-to-search field over a scrollable chip list. Replaces
// the old "wall of 50 chips" — selected services stay pinned at the top.
export function CategoryMultiSelect({
  value,
  onChange,
  error,
  max = 3,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  error?: string;
  /** Most trades a professional may list. */
  max?: number;
}) {
  const cats = useCategoryList();
  const [query, setQuery] = useState("");

  const atMax = value.length >= max;
  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else if (!atMax) {
      onChange([...value, slug]);
    }
  };

  const selected = cats.filter((c) => value.includes(c.slug));
  const filtered = useMemo(
    () => cats.filter((c) => !value.includes(c.slug) && match(c.name, query)),
    [cats, value, query],
  );

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggle(c.slug)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E1F5EE] px-3 py-1.5 text-sm font-medium text-primary"
            >
              {c.name}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services…"
          className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {/* Once the cap is reached the list dims and stops accepting picks —
          clearer than letting someone tap and silently get nothing. */}
      <div
        className={`mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border/60 bg-secondary/30 p-2.5 ${
          atMax ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {query ? "No services match that search." : "All services selected."}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggle(c.slug)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {c.name}
            </button>
          ))
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {value.length} of {max} selected
        {atMax && " — that's the maximum"}
      </p>

      {/* #5 — a way out when their trade isn't in the catalogue. */}
      <p className="mt-1 text-xs text-muted-foreground">
        Can't find your trade?{" "}
        <a
          href="mailto:support@selfeconnect.com?subject=Please%20add%20my%20trade"
          className="font-medium text-primary hover:underline"
        >
          Let us know
        </a>{" "}
        and we'll add it.
      </p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Single-select searchable combobox (job posting, search filter).
export function CategorySelect({
  value,
  onChange,
  placeholder = "Select a service…",
  allLabel,
}: {
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  /** When provided, adds an "all" option that clears the selection. */
  allLabel?: string;
}) {
  const cats = useCategoryList();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = cats.find((c) => c.slug === value);
  const filtered = useMemo(
    () => cats.filter((c) => match(c.name, query)),
    [cats, query],
  );

  const pick = (slug: string) => {
    onChange(slug);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-left text-sm outline-none focus:border-primary"
      >
        <span className={current ? "text-foreground" : "text-muted-foreground"}>
          {current ? current.name : allLabel && !value ? allLabel : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
            <div className="relative border-b border-border/60 p-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services…"
                className="h-9 w-full rounded-lg bg-secondary/50 pl-8 pr-2 text-sm outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {allLabel && (
                <button
                  type="button"
                  onClick={() => pick("")}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  {allLabel}
                  {!value && <Check className="h-4 w-4 text-primary" />}
                </button>
              )}
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  No services match that search.
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => pick(c.slug)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    {c.name}
                    {value === c.slug && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
