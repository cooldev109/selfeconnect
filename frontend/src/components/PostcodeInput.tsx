import { useEffect, useRef, useState } from "react";
import { LocateFixed, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/shared";
import { suggestPostcodes, postcodeFromCoords } from "@/lib/geo";

// A postcode box you can't get wrong.
//
// Typing suggests real postcodes and you pick one; "Use my location" fills it
// from the device with no typing at all. Free text is still allowed (people
// paste, and the server validates anyway) — the suggestions are help, not a
// cage.
export function PostcodeInput({
  value,
  onChange,
  placeholder = "e.g. M1 1AE",
  ariaLabel = "Postcode",
  className = "",
  showLocateButton = true,
}: {
  value: string;
  onChange: (postcode: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  showLocateButton?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  // Suppresses the lookup that a programmatic set (pick / geolocate) would
  // otherwise trigger, which would immediately reopen the menu.
  const skipNext = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced type-ahead.
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const { postcodes } = await suggestPostcodes(q);
        if (cancelled) return;
        setSuggestions(postcodes);
        setActive(-1);
        if (postcodes.length) setOpen(true);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [value]);

  // Click outside closes the menu.
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const pick = (pc: string) => {
    skipNext.current = true;
    onChange(pc);
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const locate = () => {
    setLocateError(null);
    if (!("geolocation" in navigator)) {
      setLocateError("Your browser can't share your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { postcode } = await postcodeFromCoords(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          if (postcode) pick(postcode);
          else setLocateError("We couldn't find a UK postcode for your location.");
        } catch {
          setLocateError("We couldn't look that up. Please type your postcode.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocateError("Location permission denied — type your postcode instead.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onFocus={() => suggestions.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="postal-code"
          maxLength={12}
          className={`pr-10 ${className}`}
        />
        {showLocateButton && (
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            title="Use my current location"
            aria-label="Use my current location"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-primary"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-elevated"
        >
          {suggestions.map((pc, i) => (
            <li key={pc}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(pc)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                  i === active ? "bg-secondary text-foreground" : "text-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                {pc}
              </button>
            </li>
          ))}
        </ul>
      )}

      {locateError && (
        <p className="mt-1 text-xs text-muted-foreground">{locateError}</p>
      )}
    </div>
  );
}
