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
