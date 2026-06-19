<script lang="ts">
  import Overlay from "$lib/Overlay.svelte";
  import { shortDate } from "$lib/dates";
  import type { Card, Comment } from "$lib/types.ts";

  let {
    cards,
    commentsByCard = new Map(),
    onclose,
  }: {
    cards: Card[];
    commentsByCard?: Map<string, Comment[]>;
    onclose: () => void;
  } = $props();

  let grouped = $derived.by(() => {
    const groups: { label: string; cards: Card[] }[] = [];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (const card of cards) {
      if (!card.doneAt) continue;
      const date = new Date(card.doneAt);
      const label = dayNames[date.getDay()];

      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, cards: [] };
        groups.push(group);
      }
      group.cards.push(card);
    }
    return groups;
  });

  let copied = $state(false);
  let copiedComments = $state(false);

  function buildMarkdown(includeComments: boolean): string[] {
    const now = new Date();
    const header = `# Weekly Review — ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
    const lines: string[] = [header, ""];

    for (const group of grouped) {
      lines.push(`## ${group.label}`);
      for (const card of group.cards) {
        const tags = card.tags.length > 0 ? " " + card.tags.map((t) => `\`#${t}\``).join(" ") : "";
        lines.push(`- ${card.name}${tags}`);

        if (includeComments) {
          const cardComments = commentsByCard.get(card.id) ?? [];
          for (const comment of cardComments) {
            const dateStr = shortDate(comment.createdAt);
            for (const line of comment.body.split("\n")) {
              lines.push(`  - _(${dateStr})_ ${line}`);
            }
          }
        }
      }
      lines.push("");
    }

    return lines;
  }

  async function handleCopyWithoutComments() {
    await navigator.clipboard.writeText(buildMarkdown(false).join("\n"));
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  async function handleCopyWithComments() {
    await navigator.clipboard.writeText(buildMarkdown(true).join("\n"));
    copiedComments = true;
    setTimeout(() => (copiedComments = false), 1500);
  }
</script>

<Overlay {onclose} class="review-dialog">
  <div class="header">
    <h3>Weekly Review</h3>
    <span class="total">{cards.length} done this week</span>
  </div>
  <p class="note">Cards marked done in the last 7 days.</p>

  <div class="body">
    {#if grouped.length === 0}
      <p class="empty">No cards completed this week yet.</p>
    {:else}
      {#each grouped as group}
        <div class="day-group">
          <h4 class="day-label">{group.label}</h4>
          {#each group.cards as card}
            <div class="review-card">
              <span class="review-name">{card.name}</span>
              <div class="review-meta">
                {#if (commentsByCard.get(card.id)?.length ?? 0) > 0}
                  <span class="comment-count" title="comments">
                    {commentsByCard.get(card.id)!.length}
                    💬
                  </span>
                {/if}
                {#if card.tags.length > 0}
                  <span class="review-tags">
                    {#each card.tags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  </div>

  <div class="dialog-actions">
    <button type="button" class="btn" onclick={handleCopyWithoutComments}>
      {copied ? "Copied!" : "Copy as Markdown"}
    </button>
    <button type="button" class="btn" onclick={handleCopyWithComments}>
      {copiedComments ? "Copied!" : "Copy with Comments"}
    </button>
    <button type="button" class="btn primary" onclick={onclose}>Close</button>
  </div>
</Overlay>

<style>
  :global(.review-dialog) {
    min-width: 500px;
    max-width: 560px;
    max-height: 80vh;
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .header h3 {
    margin: 0;
    font-size: 18px;
  }

  .total {
    font-size: 13px;
    color: var(--accent);
  }

  .body {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .note {
    font-size: 12px;
    color: #666;
    font-style: italic;
    margin: 0;
  }

  .empty {
    text-align: center;
    color: var(--text-empty);
    font-size: 13px;
    padding: 20px 0;
    margin: 0;
  }

  .day-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .day-label {
    margin: 0;
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .review-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    background: var(--bg-base);
    border-radius: 6px;
  }

  .review-name {
    font-size: 14px;
    color: var(--text-muted);
  }

  .review-tags {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .review-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .comment-count {
    font-size: 11px;
    color: var(--text-dim);
  }

  .tag {
    font-size: 10px;
    background: var(--border);
    color: var(--tag-text);
    border-radius: 4px;
    padding: 2px 6px;
  }

  .dialog-actions {
    display: flex;
    justify-content: space-between;
    flex-shrink: 0;
  }
</style>
