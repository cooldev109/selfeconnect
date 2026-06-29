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
import { LOGO_MARK_SVG, LogoMark } from "@/components/Logo";
import { updateMe, uploadPhoto } from "@/lib/driver";
import { useRequireAuth } from "@/lib/useRequireAuth";
import professionalsFlyer from "@/assets/professionals-flyer.png";
import flyerDriver from "@/assets/flyer-driver.png";
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

  // Full printable leaflet matching the SelfeConnect flyer model.
  const downloadFlyer = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas || !driver) return;
    const qr = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    const origin = window.location.origin;
    const I = {
      shield: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
      pound: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 17h6M9.5 17c1-1 1-2 1-3.5S9.8 9 11.5 9c1 0 1.6.5 2 1M8.5 13H13"/></svg>`,
      heart: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6.5c-1.7-1.9-4.6-2-6.4-.2L12 7l-.6-.7C9.6 4.5 6.7 4.6 5 6.5c-1.6 1.8-1.5 4.6.3 6.3L12 19l6.7-6.2c1.8-1.7 1.9-4.5.3-6.3z"/></svg>`,
      heartFill: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#1D9E75"><path d="M19 6.5c-1.7-1.9-4.6-2-6.4-.2L12 7l-.6-.7C9.6 4.5 6.7 4.6 5 6.5c-1.6 1.8-1.5 4.6.3 6.3L12 19l6.7-6.2c1.8-1.7 1.9-4.5.3-6.3z"/></svg>`,
      people: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 5.5a3 3 0 0 1 0 5M21 20c0-2.5-1.5-4.2-4-4.8"/></svg>`,
      mega: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1z"/><path d="M18 8a4 4 0 0 1 0 8"/></svg>`,
      arrow: `<svg viewBox="0 0 40 40" width="46" height="46" fill="none" stroke="#1D9E75" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10c10 1 20 6 26 18"/><path d="M26 18l6 10-11 1"/></svg>`,
    };
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>SelfeConnect flyer — ${driver.id}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; font-family: 'Manrope', Inter, system-ui, sans-serif; color: #102A43; }
        .page { width: 210mm; min-height: 297mm; padding: 14mm 14mm; margin: 0 auto; }
        .brand { display: flex; align-items: center; justify-content: center; gap: 10px; }
        .brand .mark { width: 42px; height: 42px; }
        .wordmark { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; }
        .wordmark .a { color: #102A43; } .wordmark .b { color: #1D9E75; }
        .tagline { text-align: center; font-size: 9.5px; letter-spacing: 2.5px; color: #94A3B8; text-transform: uppercase; margin-top: 3px; }
        .hero { display: flex; align-items: center; gap: 6px; margin-top: 18px; }
        .hero-l { flex: 1.05; }
        .hero-r { flex: 1; }
        .hero-r img { width: 100%; display: block; }
        h1 { font-size: 52px; line-height: 0.98; margin: 0 0 14px; font-weight: 800; color: #102A43; }
        h1 .teal { color: #1D9E75; }
        .lead { font-size: 15px; line-height: 1.45; color: #475569; max-width: 92%; margin: 0; }
        .rule { width: 64px; height: 3px; background: #1D9E75; border-radius: 2px; margin: 0 0 14px; }
        .scanrow { display: flex; align-items: center; gap: 16px; margin: 24px 0 6px; }
        .scanbox { background: #EEF7F1; border-radius: 16px; padding: 16px 18px; flex: 1; display: flex; align-items: center; gap: 14px; }
        .hcircle { width: 40px; height: 40px; min-width: 40px; border: 2px solid #1D9E75; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
        .scan-title { color: #1D9E75; font-size: 18px; font-weight: 800; }
        .scan-sub { font-size: 14px; color: #475569; margin-top: 2px; }
        .arrow { display: flex; align-items: center; }
        .qr { width: 168px; height: 168px; min-width: 168px; border: 3px solid #1D9E75; border-radius: 16px; padding: 7px; background: #fff; }
        .qr img { width: 100%; height: 100%; }
        .pid { font-family: monospace; font-weight: 700; letter-spacing: 2px; color: #102A43; font-size: 13px; margin: 4px 0 0; text-align: right; }
        .about { display: flex; gap: 12px; align-items: flex-start; margin: 16px 0 4px; }
        .about .ic { width: 38px; height: 38px; min-width: 38px; border: 2px solid #1D9E75; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
        .about-title { color: #1D9E75; font-weight: 800; font-size: 14px; }
        .about-text { color: #475569; font-size: 12.5px; line-height: 1.4; }
        .about-note { color: #1D9E75; font-size: 12px; font-style: italic; margin-top: 2px; }
        .feats { display: flex; gap: 16px; border-top: 1px solid #E2E8F0; margin-top: 18px; padding-top: 18px; }
        .feat { flex: 1; text-align: center; }
        .feat .t { font-weight: 800; color: #1D9E75; margin-top: 6px; font-size: 14px; }
        .feat .s { color: #475569; font-size: 12.5px; }
        .note { background: #EEF7F1; border-radius: 14px; padding: 14px 16px; margin-top: 20px; color: #475569; font-size: 12.5px; line-height: 1.45; display: flex; gap: 12px; align-items: flex-start; }
        .note b { color: #1D9E75; }
        .note .green { color: #1D9E75; }
        .foot { text-align: center; color: #94A3B8; font-size: 12px; margin-top: 16px; }
        .foot b { color: #1D9E75; }
      </style></head><body>
      <div class="page">
        <div class="brand">
          <span class="mark">${LOGO_MARK_SVG}</span>
          <span class="wordmark"><span class="a">Selfe</span><span class="b">Connect</span></span>
        </div>
        <div class="tagline">Independent. Impartial. Impactful.</div>

        <div class="hero">
          <div class="hero-l">
            <h1>Enjoying<br/>your<br/><span class="teal">delivery?</span></h1>
            <div class="rule"></div>
            <p class="lead">Your driver helped make it happen and get your order safely to your door.</p>
          </div>
          <div class="hero-r"><img src="${origin}${flyerDriver}" alt="" /></div>
        </div>

        <div class="scanrow">
          <div class="scanbox">
            <span class="hcircle">${I.heartFill}</span>
            <span>
              <div class="scan-title">Want to say thanks?</div>
              <div class="scan-sub">Scan the QR code to leave a tip <b>in seconds</b>.</div>
            </span>
          </div>
          <span class="arrow">${I.arrow}</span>
          <div class="qr"><img src="${qr}" alt="QR code"/></div>
        </div>
        <div class="pid">ID: ${driver.id}</div>

        <div class="about">
          <span class="ic">${I.people}</span>
          <span>
            <div class="about-title">About this review</div>
            <div class="about-text">This review is for the professional driver only and for the SelfeConnect community.</div>
            <div class="about-note">We are an independent review company.</div>
          </span>
        </div>

        <div class="feats">
          <div class="feat">${I.shield}<div class="t">100% Secure</div></div>
          <div class="feat">${I.pound}<div class="t">Goes directly</div><div class="s">to your driver.</div></div>
          <div class="feat">${I.heart}<div class="t">Any amount</div><div class="s">is appreciated.</div></div>
        </div>

        <div class="note">
          <span>${I.mega}</span>
          <span><b>Official feedback still matters.</b> Reviews and reports are still encouraged to be made through the company's official channels. <span class="green">Thank you for helping recognise excellent service. ♥</span></span>
        </div>

        <div class="foot">Learn more: <b>www.selfeconnect.com</b></div>
      </div>
      <script>
        var img = document.querySelector('.hero-r img');
        function go(){ window.print(); }
        if (img && !img.complete) { img.onload = go; img.onerror = go; } else { window.onload = go; }
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
