import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  UserPlus,
  FileText,
  BadgeCheck,
  Star,
  Wallet,
  Briefcase,
  ShieldCheck,
  Circle,
} from "lucide-react";
import { Modal } from "@/components/shared";
import { timeAgo } from "@/lib/utils";
import {
  getCustomerHistory,
  getDriverHistory,
  type HistoryEvent,
} from "@/lib/adminAnalytics";

const ICONS: Record<string, typeof Circle> = {
  signup: UserPlus,
  quote: FileText,
  hired: BadgeCheck,
  review: Star,
  tip: Wallet,
  payment: Wallet,
  job: Briefcase,
  verification: ShieldCheck,
};

function Event({ e, last }: { e: HistoryEvent; last: boolean }) {
  const Icon = ICONS[e.kind] ?? Circle;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-primary">
          <Icon className="h-4 w-4" />
        </div>
        {!last && <div className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <p className="text-sm font-medium text-foreground">{e.title}</p>
        {e.detail && <p className="truncate text-xs text-muted-foreground">{e.detail}</p>}
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{timeAgo(e.at)}</p>
      </div>
    </div>
  );
}

export function UserHistoryModal({
  open,
  onClose,
  kind,
  id,
  name,
}: {
  open: boolean;
  onClose: () => void;
  kind: "driver" | "customer";
  id: string | null;
  name: string;
}) {
  const q = useQuery({
    queryKey: ["user-history", kind, id],
    queryFn: () => (kind === "driver" ? getDriverHistory(id!) : getCustomerHistory(id!)),
    enabled: open && !!id,
    retry: false,
  });

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose(); }} title={`History — ${name}`}>
      {q.isLoading || !q.data ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap gap-4 rounded-xl bg-muted/50 p-3 text-sm">
            {Object.entries(q.data.stats).map(([k, v]) => (
              <div key={k}>
                <span className="font-bold text-foreground">
                  {k === "earnings" ? `£${Number(v).toFixed(2)}` : v}
                </span>{" "}
                <span className="text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
          <div className="max-h-[50vh] overflow-y-auto pr-1">
            {q.data.timeline.map((e, i) => (
              <Event key={i} e={e} last={i === q.data.timeline.length - 1} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
