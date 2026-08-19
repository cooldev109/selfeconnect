// A compact strip of a job's attached photos — thumbnails that open full-size
// in a new tab. Shown to professionals on the job board and in "My jobs" so
// they can see what the customer attached before quoting.
export function JobPhotos({ photos }: { photos: string[] | undefined }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {photos.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt="Job photo"
            loading="lazy"
            className="h-20 w-20 rounded-lg border border-border object-cover transition hover:opacity-90"
          />
        </a>
      ))}
    </div>
  );
}
