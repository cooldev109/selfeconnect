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

  // Printable flyer matching Raul's model. Fully crisp: HTML/CSS text, SVG
  // icons, a high-resolution illustration and the per-professional QR.
  const downloadFlyer = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas || !driver) return;
    const qr = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    const origin = window.location.origin;
    const I = {
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
      pound: `<svg viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 17h6M9.5 17c1-1 1-2 1-3.5S9.8 9 11.5 9c1 0 1.6.5 2 1M8.5 13H13"/></svg>`,
      heart: `<svg viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6.5c-1.7-1.9-4.6-2-6.4-.2L12 7l-.6-.7C9.6 4.5 6.7 4.6 5 6.5c-1.6 1.8-1.5 4.6.3 6.3L12 19l6.7-6.2c1.8-1.7 1.9-4.5.3-6.3z"/></svg>`,
      heartFill: `<svg viewBox="0 0 24 24" fill="#1D9E75"><path d="M19 6.5c-1.7-1.9-4.6-2-6.4-.2L12 7l-.6-.7C9.6 4.5 6.7 4.6 5 6.5c-1.6 1.8-1.5 4.6.3 6.3L12 19l6.7-6.2c1.8-1.7 1.9-4.5.3-6.3z"/></svg>`,
      people: `<svg viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 5.5a3 3 0 0 1 0 5M21 20c0-2.5-1.5-4.2-4-4.8"/></svg>`,
    };
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>SelfeConnect flyer — ${driver.id}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>
        @page { size: A4; margin: 0; }
        :root{
          --ink:#0F2438; --ink2:#33475B; --muted:#7C8DA0;
          --teal:#1D9E75; --teal-d:#15805E; --mint:#E9F6F0; --mint2:#F4FBF8; --line:#E6EDF2;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
        .page { width: 794px; height: 1123px; background: #fff; padding: 50px 54px 34px; margin: 0 auto; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .blob { position: absolute; border-radius: 999px; background: var(--mint); opacity: .55; }
        .blob.a { width: 320px; height: 320px; top: -140px; right: -120px; }
        .blob.b { width: 240px; height: 240px; bottom: -120px; left: -110px; }
        .inner { position: relative; display: flex; flex-direction: column; flex: 1; }
        .brand { display: flex; align-items: center; justify-content: center; gap: 12px; }
        .brand .mark { width: 46px; height: 46px; display: inline-flex; }
        .brand .mark svg { width: 100%; height: 100%; }
        .wm { font-size: 34px; font-weight: 800; letter-spacing: -1px; }
        .wm .b { color: var(--teal); }
        .tag { text-align: center; margin-top: 7px; font-size: 11px; letter-spacing: 3.5px; color: var(--muted); font-weight: 700; text-transform: uppercase; }
        .hero { margin-top: 26px; background: linear-gradient(135deg, var(--mint) 0%, var(--mint2) 70%); border: 1px solid var(--line); border-radius: 30px; padding: 30px 32px; display: flex; align-items: center; gap: 6px; overflow: hidden; }
        .hero .copy { flex: 1.15; }
        .eyebrow { display: inline-flex; align-items: center; gap: 7px; background: #fff; border: 1px solid var(--line); color: var(--teal-d); font-weight: 700; font-size: 12px; padding: 7px 13px; border-radius: 999px; margin-bottom: 16px; }
        .eyebrow svg { width: 14px; height: 14px; }
        h1 { font-size: 50px; line-height: 0.96; font-weight: 800; letter-spacing: -1.6px; }
        h1 .t { color: var(--teal); }
        .hero p { margin-top: 15px; font-size: 15.5px; line-height: 1.5; color: var(--ink2); max-width: 300px; }
        .ill { width: 286px; flex-shrink: 0; margin: -6px -14px -26px 0; }
        .ill img { width: 100%; display: block; }
        .tip { margin-top: 24px; background: var(--ink); border-radius: 30px; padding: 28px 32px; display: flex; align-items: center; gap: 26px; color: #fff; box-shadow: 0 26px 46px -24px rgba(15,36,56,.55); position: relative; overflow: hidden; }
        .tip::after { content: ""; position: absolute; width: 240px; height: 240px; border-radius: 999px; background: rgba(29,158,117,.18); right: -90px; top: -110px; }
        .tip .copy { flex: 1; position: relative; }
        .kicker { font-size: 12.5px; color: #7FE0C2; font-weight: 800; letter-spacing: 1.5px; }
        .tip h2 { font-size: 31px; font-weight: 800; margin-top: 7px; line-height: 1.04; letter-spacing: -.5px; }
        .tip p { margin-top: 11px; color: #BCccD8; font-size: 14px; line-height: 1.5; max-width: 300px; }
        .qrwrap { background: #fff; border-radius: 22px; padding: 15px 15px 9px; text-align: center; position: relative; z-index: 2; }
        .qrwrap img { width: 166px; height: 166px; display: block; }
        .qrwrap .id { margin-top: 7px; font-size: 11.5px; font-weight: 700; letter-spacing: 2px; color: var(--ink); }
        .trust { margin-top: 24px; display: flex; }
        .trust .c { flex: 1; text-align: center; padding: 0 8px; position: relative; }
        .trust .c + .c::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 1px; background: var(--line); }
        .trust .ic { width: 46px; height: 46px; border-radius: 999px; background: var(--mint); display: flex; align-items: center; justify-content: center; margin: 0 auto 11px; }
        .trust .ic svg { width: 23px; height: 23px; }
        .trust .t { font-weight: 700; font-size: 14.5px; }
        .trust .s { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
        .review { display: flex; gap: 13px; align-items: flex-start; padding: 17px 4px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin-top: 24px; }
        .review .ic { width: 40px; height: 40px; border: 2px solid var(--teal); border-radius: 999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .review .ic svg { width: 20px; height: 20px; }
        .review .rt { font-weight: 800; color: var(--teal-d); font-size: 14px; }
        .review .rb { font-size: 12.8px; color: var(--ink2); margin-top: 2px; line-height: 1.4; }
        .review .rn { font-size: 12.5px; color: var(--teal); font-style: italic; margin-top: 3px; }
        .foot { margin-top: auto; text-align: center; padding-top: 16px; font-size: 12.5px; color: var(--muted); line-height: 1.5; }
        .foot b { color: var(--ink2); }
        .foot .site { color: var(--teal); font-weight: 800; }
      </style></head><body>
      <div class="page">
        <div class="blob a"></div><div class="blob b"></div>
        <div class="inner">
          <div class="brand">
            <span class="mark">${LOGO_MARK_SVG}</span>
            <span class="wm">Selfe<span class="b">Connect</span></span>
          </div>
          <div class="tag">Independent &nbsp;·&nbsp; Impartial &nbsp;·&nbsp; Impactful</div>

          <div class="hero">
            <div class="copy">
              <span class="eyebrow">${I.heartFill} A note from your driver</span>
              <h1>Enjoying your <span class="t">delivery?</span></h1>
              <p>Your driver helped make it happen — and got your order safely to your door.</p>
            </div>
            <div class="ill"><img src="${origin}${flyerDriver}" alt="" /></div>
          </div>

          <div class="tip">
            <div class="copy">
              <div class="kicker">WANT TO SAY THANKS?</div>
              <h2>Leave a tip in seconds</h2>
              <p>Point your phone camera at the code to leave a quick review and tip — <b style="color:#fff">100% goes to your driver.</b></p>
            </div>
            <div class="qrwrap"><img src="${qr}" alt="QR code"/><div class="id">ID&nbsp;·&nbsp;${driver.id}</div></div>
          </div>

          <div class="trust">
            <div class="c"><div class="ic">${I.shield}</div><div class="t">100% Secure</div><div class="s">Powered by Stripe</div></div>
            <div class="c"><div class="ic">${I.pound}</div><div class="t">Goes directly</div><div class="s">to your driver</div></div>
            <div class="c"><div class="ic">${I.heart}</div><div class="t">Any amount</div><div class="s">is appreciated</div></div>
          </div>

          <div class="review">
            <div class="ic">${I.people}</div>
            <div><div class="rt">About this review</div><div class="rb">This review is for the professional driver only and for the SelfeConnect community.</div><div class="rn">We are an independent review company.</div></div>
          </div>

          <div class="foot"><b>Official feedback still matters.</b> Reviews and reports should still be made through the company's official channels.<br>Learn more at <span class="site">www.selfeconnect.com</span></div>
        </div>
      </div>
      <script>
        var img = document.querySelector('.ill img');
        function go(){ setTimeout(function(){ window.print(); }, 250); }
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
            <div className="flex gap-px bg-border/60">
              <img
                src={professionalsFlyer}
                alt="A professional handing a SelfeConnect QR flyer to a happy customer"
                loading="lazy"
                className="aspect-square w-1/2 object-cover md:aspect-auto md:h-full"
              />
              <img
                src={scanQr}
                alt="Customer scanning a QR code with their phone"
                loading="lazy"
                className="aspect-square w-1/2 object-cover md:aspect-auto md:h-full"
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
