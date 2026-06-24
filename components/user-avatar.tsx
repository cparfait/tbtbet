import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
}

export function UserAvatar({ src, name, className }: UserAvatarProps) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        className={cn("rounded-full object-cover ring-2 ring-[var(--color-accent)]/30 shrink-0", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 flex items-center justify-center rounded-full bg-[var(--color-accent)]/20 font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30",
        className
      )}
    >
      <span style={{ fontSize: "52%" }}>{initials}</span>
    </span>
  );
}
