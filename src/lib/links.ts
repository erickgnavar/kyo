import { openUrl } from "@tauri-apps/plugin-opener";

/** Click handler for rendered markdown content. Opens external links in the OS browser. */
export function handleMarkdownClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const anchor = target.closest("a");
  if (anchor?.href) {
    e.preventDefault();
    openUrl(anchor.href);
  }
}
