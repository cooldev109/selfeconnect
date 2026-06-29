import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, BadgeCheck, Camera, Download, FileText, Link2, Lightbulb } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
} from "@/components/shared";
import { useMe } from "@/hooks/useDriver";
import { LogoMark } from "@/components/Logo";
import { updateMe, uploadPhoto } from "@/lib/driver";
import { useRequireAuth } from "@/lib/useRequireAuth";
import professionalsFlyer from "@/assets/professionals-flyer.png";
import flyerBg from "@/assets/flyer-bg.png";
import scanQr from "@/assets/scan-qr.jpg";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — SelfeConnect" },
      { name: "description", content: "Your public driver profile and QR Code." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const auth = useRequireAuth();
  const { data: driver } = useMe();
  const qrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setCompany(driver.company);
      setPhoto(driver.photoUrl);
    }
  }, [driver]);

  const tipPath = `/tip/${driver?.id ?? ""}`;
  const tipUrl = useMemo(() => {
    if (typeof window === "undefined") return `https://tipvan.app${tipPath}`;
    return `${window.location.origin}${tipPath}`;
  }, [tipPath]);

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    // Instant local preview, then persist to the server.
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result ?? ""));
    reader.readAsDataURL(file);
    try {
      const updated = await uploadPhoto(file);
      setPhoto(updated.photoUrl);
    } catch {
      /* keep local preview on failure */
    }
  };

  const downloadPng = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas || !driver) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `selfeconnect-${driver.id}.png`;
    a.click();
  };

  const downloadPdf = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas || !driver) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>SelfeConnect card — ${driver.id}</title>
      <style>
        @page { size: A6; margin: 12mm; }
        body { font-family: Inter, system-ui, sans-serif; text-align: center; color: #0F6E56; }
        h1 { margin: 0 0 4px; font-size: 18px; }
        p { margin: 4px 0; color: #334155; font-size: 13px; }
        img { width: 70%; margin: 12px auto; display: block; }
        .id { font-weight: 800; letter-spacing: 0.15em; font-size: 22px; color: #0F172A; }
      </style></head><body>
      <h1>Tip your driver</h1>
      <p>Scan to leave a tip — 100% goes to the driver.</p>
      <img src="${dataUrl}" alt="QR" />
      <div class="id">${driver.id}</div>
      <p>${tipUrl}</p>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`);
    w.document.close();
  };

  // Printable flyer: Raul's artwork as the background image, with each
  // professional's own QR overlaid into the blank QR placeholder.
  const downloadFlyer = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas || !driver) return;
    const qr = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    const bg = `${window.location.origin}${flyerBg}`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>SelfeConnect flyer — ${driver.id}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { margin: 0; height: 100%; }
        body { display: flex; align-items: center; justify-content: center; background: #fff; }
        .sheet { position: relative; height: 297mm; }
        .sheet .bg { height: 297mm; display: block; }
        /* QR placeholder box as % of the artwork; object-fit centres the square QR. */
        .sheet .qr { position: absolute; left: 62.17%; top: 52.63%; width: 30.28%; height: 22.26%; object-fit: contain; }
      </style></head><body>
      <div class="sheet">
        <img class="bg" src="${bg}" alt="" />
        <img class="qr" src="${qr}" alt="QR code" />
      </div>
      <script>
        var bg = document.querySelector('.bg');
        function go(){ window.print(); }
        if (bg && !bg.complete) { bg.onload = go; bg.onerror = go; } else { window.onload = go; }
      </script>
    </body></html>`);
    w.document.close();
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMe({ name, company });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  if (!auth.data || !driver) return null;

  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <LogoMark className="h-9 w-9" tone="white" />
            <span className="text-lg font-bold tracking-tight">SelfeConnect</span>
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-primary-foreground/90 transition hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-6 pt-6">
        {/* Identity card */}
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <img
              src={photo}
              alt={name}
              className="h-24 w-24 rounded-full border-4 border-primary/20 object-cover"
            />
            <Badge className="mt-4 gap-1 rounded-full bg-[#E1F5EE] px-3 py-1 text-primary hover:bg-[#E1F5EE]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Profile created
            </Badge>
            <h2 className="mt-3 text-xl font-bold text-foreground">{name}</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Your exclusive driver ID:
            </p>
            <div className="mt-2 rounded-full bg-foreground px-6 py-2 text-2xl font-extrabold tracking-[0.25em] text-background">
              {driver.id}
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              This QR Code is yours. Print it once and attach to all packages.
            </p>
          </CardContent>
        </Card>

        {/* QR Code card */}
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center p-6">
            <div
              ref={qrRef}
              className="rounded-2xl bg-white p-4 ring-1 ring-border"
            >
              <QRCodeCanvas
                value={tipUrl}
                size={224}
                level="H"
                marginSize={2}
                fgColor="#0F172A"
              />
            </div>

            <div className="mt-5 w-full max-w-xs space-y-3">
              {/* Full printable flyer (the SelfeConnect leaflet) */}
              <Button
                type="button"
                onClick={downloadFlyer}
                className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                Download flyer (PDF)
              </Button>
              {/* QR-code-only outputs */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadPng}
                  className="h-11 rounded-xl border-primary/30 text-primary hover:bg-[#E1F5EE]"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  QR (PNG)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadPdf}
                  className="h-11 rounded-xl border-primary/30 text-primary hover:bg-[#E1F5EE]"
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  QR (PDF)
                </Button>
              </div>
            </div>

            <div className="mt-5 flex w-full items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-mono">{tipUrl}</span>
            </div>
          </CardContent>
        </Card>

        {/* Where to put it */}
        <Card className="overflow-hidden rounded-2xl border-border/60">
          <CardContent className="grid gap-0 p-0 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-px bg-border/60">
              <img
                src={professionalsFlyer}
                alt="A professional handing a SelfeConnect QR flyer to a happy customer"
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <img
                src={scanQr}
                alt="Customer scanning a QR code with their phone"
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="p-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
                <Lightbulb className="h-3.5 w-3.5" /> Pro tip
              </span>
              <h3 className="mt-3 text-lg font-bold text-foreground font-display">
                Where to show your QR
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Professionals who show their code in <strong>two visible spots</strong> get
                more reviews and tips. Hand the printed flyer to your customer and keep it
                on display where they can see it.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 text-primary" /> Hand it to customers</li>
                <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 text-primary" /> On display where customers can see it</li>
                <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 text-primary" /> On your phone for quick handovers</li>
              </ul>
            </div>
          </CardContent>
        </Card>



        {/* Editable details */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-foreground">
              Edit your details
            </h3>
            <form onSubmit={onSave} className="mt-5 space-y-5">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-dashed border-border bg-secondary transition hover:border-primary"
                  aria-label="Change profile photo"
                >
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </span>
                </button>
                <div>
                  <p className="text-sm font-medium text-foreground">Profile photo</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Change photo
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoChange}
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Full name
                </span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Company name
                </span>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={80}
                  placeholder="Optional"
                />
              </label>

              <div className="flex items-center justify-between">
                {savedAt && !saving ? (
                  <p className="text-xs text-primary">Saved.</p>
                ) : (
                  <span />
                )}
                <Button
                  type="submit"
                  disabled={saving || name.trim().length < 2}
                  className="h-11 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
