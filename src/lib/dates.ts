/**
 * Converts a date string (ISO "YYYY-MM-DD") to a short relative label.
 */
export function relativeTime(dateStr: string): string {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffMs = targetDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;

  // Beyond a week: just the date like "Jun 15"
  return target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Converts a millisecond timestamp to a short relative label like "2 min ago". */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
