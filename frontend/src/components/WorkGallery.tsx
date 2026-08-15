import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/shared";
import { addGalleryPhoto, removeGalleryPhoto } from "@/lib/driver";

const MAX = 12;

// The professional's own work-gallery manager (on their profile page): upload
// photos of past jobs, remove them. Photos are shown to customers on the public
// profile. Reads its list from the passed `photos` and re-fetches ["me"] on
// change, so it stays in sync with the rest of the profile page.
export function WorkGallery({ photos }: { photos: string[] }) {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (url: string) => removeGalleryPhoto(url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const onPick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = MAX - photos.length;
    const picked = Array.from(files).slice(0, room);
    setUploading(true);
    try {
      for (const file of picked) await addGalleryPhoto(file);
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch {
      setError("Couldn't upload that image. Please try another.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Work gallery</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Show off past jobs — customers see these on your profile.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {photos.length} of {MAX}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((url) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border"
            >
              <img src={url} alt="Work" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove.mutate(url)}
                disabled={remove.isPending}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {photos.length < MAX && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-input text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Add</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onPick(e.target.files)}
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
