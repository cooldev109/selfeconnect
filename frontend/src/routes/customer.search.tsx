import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Search as SearchIcon } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { CategorySelect } from "@/components/CategoryPicker";
import { StarRow } from "@/components/Reviews";
import { browsePros } from "@/lib/pros";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/customer/search")({
  // A search started from the homepage hero arrives here as URL params, so the
  // visitor's intent survives the sign-in step.
  validateSearch: (
    s: Record<string, unknown>,
  ): { category?: string; postcode?: string } => ({
    category: typeof s.category === "string" ? s.category : undefined,
    postcode: typeof s.postcode === "string" ? s.postcode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find a professional — SelfeConnect" },
      { name: "description", content: "Search reviewed professionals near you." },
    ],
  }),
  component: SearchPage,
});

const RADII = [5, 10, 25, 50, 100];

function SearchPage() {
  const initial = Route.useSearch();
  const [category, setCategory] = useState(initial.category ?? "");
  const [postcode, setPostcode] = useState(initial.postcode ?? "");
  const [radius, setRadius] = useState(25);
  const [applied, setApplied] = useState<{
    category?: string;
    postcode?: string;
    radius?: number;
  }>({
    category: initial.category || undefined,
    postcode: initial.postcode || undefined,
    radius: initial.postcode ? 25 : undefined,
  });

  const prosQ = useQuery({
    queryKey: ["pros", applied],
    queryFn: () => browsePros(applied),
    retry: false,
  });

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied({
      category: category || undefined,
      postcode: postcode || undefined,
      radius: postcode ? radius : undefined,
    });
  };

  const badPostcode = prosQ.error instanceof ApiError && prosQ.error.status === 400;
  const pros = prosQ.data ?? [];

  return (
    <CustomerShell
      title="Find a professional"
      subtitle="Search reviewed professionals by service and location."
    >
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <form
            onSubmit={apply}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          >
            <div className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Service
              </span>
              <CategorySelect
                value={category}
                onChange={setCategory}
                allLabel="All services"
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Postcode
              </span>
              <Input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g. M1 1AE"
                maxLength={12}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Within
              </span>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {r} mi
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <SearchIcon className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
          {badPostcode && (
            <p className="mt-2 text-xs text-destructive">
              Enter a valid UK postcode.
            </p>
          )}
        </CardContent>
      </Card>

      {prosQ.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : pros.length === 0 && !badPostcode ? (
        <Card className="mt-6 rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No professionals match your search yet. Try a different service or a
            wider radius.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {pros.map((p) => (
            <Card key={p.publicId} className="rounded-2xl">
              <CardContent className="flex items-center gap-4 p-4">
                <img
                  src={
                    p.photoUrl ||
                    "https://api.dicebear.com/7.x/initials/svg?seed=" +
                      encodeURIComponent(p.name)
                  }
                  alt={p.name}
                  className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">
                      {p.name}
                    </h3>
                    {p.distanceMiles != null && (
                      <Badge className="rounded-full bg-secondary text-muted-foreground hover:bg-secondary">
                        <MapPin className="mr-1 h-3 w-3" /> {p.distanceMiles} mi
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <StarRow value={p.avgRating} className="h-3.5 w-3.5" />
                    <span>
                      {p.avgRating.toFixed(1)} ({p.reviewCount})
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {p.categories.join(" · ")}
                  </p>
                </div>
                <Link
                  to="/customer/pros/$publicId"
                  params={{ publicId: p.publicId }}
                  className="inline-flex h-9 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View profile
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CustomerShell>
  );
}
