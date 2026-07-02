import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Star, Mail, Phone, MapPin } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Badge, Card, CardContent } from "@/components/shared";
import { useRequireCustomer } from "@/lib/useRequireCustomer";
import { getProProfile } from "@/lib/pros";

export const Route = createFileRoute("/customer/pros/$publicId")({
  head: () => ({ meta: [{ title: "Professional profile — SelfeConnect" }] }),
  component: ProProfilePage,
});

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

function ProProfilePage() {
  const { customer, loading } = useRequireCustomer();
  const { publicId } = useParams({ from: "/customer/pros/$publicId" });
  const q = useQuery({
    queryKey: ["pro-profile", publicId],
    queryFn: () => getProProfile(publicId),
    retry: false,
    enabled: !!customer,
  });

  if (loading || q.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }
  if (!customer) return null;

  const p = q.data;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-foreground font-display">
              SelfeConnect
            </span>
          </div>
          <Link
            to="/customer/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to search
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {!p ? (
          <Card className="rounded-2xl">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              This professional could not be found.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src={p.photoUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(p.name)}
                    alt={p.name}
                    className="h-20 w-20 rounded-full border border-border object-cover"
                  />
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground font-display">
                      {p.name}
                    </h1>
                    {p.company && (
                      <p className="text-sm text-muted-foreground">{p.company}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Stars value={p.avgRating} />
                      <span>
                        {p.avgRating.toFixed(1)} · {p.reviewCount} review
                        {p.reviewCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {p.categories.map((c) => (
                    <Badge
                      key={c}
                      className="rounded-full bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>

                {p.bio && (
                  <p className="mt-4 text-sm text-foreground/90">{p.bio}</p>
                )}
                {(p.city || p.postcode) && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {p.city || p.postcode}
                  </p>
                )}

                {/* Contact */}
                <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
                  {p.contact.phone && (
                    <a
                      href={`tel:${p.contact.phone}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Phone className="h-4 w-4" /> {p.contact.phone}
                    </a>
                  )}
                  <a
                    href={`mailto:${p.contact.email}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <Mail className="h-4 w-4" /> {p.contact.email}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <h2 className="mt-8 text-lg font-semibold text-foreground">Reviews</h2>
            {p.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No reviews yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {p.reviews.map((r, i) => (
                  <Card key={i} className="rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Stars value={r.rating ?? 0} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.date).toLocaleDateString()}
                        </span>
                      </div>
                      {r.message && (
                        <p className="mt-2 text-sm text-foreground/90">
                          "{r.message}"
                        </p>
                      )}
                      {r.customerName && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          — {r.customerName}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
