import { cn } from "@/lib/utils";

interface TeamLogoProps {
  url?: string | null;
  name: string;
  poolColor?: string | null;
  className?: string;
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

export function TeamLogo({ url, name, poolColor, className }: TeamLogoProps) {
  const initials = getInitials(name);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={cn("object-contain shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn("shrink-0 flex items-center justify-center font-bold uppercase leading-none", className)}
      style={
        poolColor
          ? { background: poolColor + "25", color: poolColor }
          : { background: "var(--color-surface-2)", color: "var(--color-muted)" }
      }
    >
      <span style={{ fontSize: "38%" }}>{initials}</span>
    </div>
  );
}
