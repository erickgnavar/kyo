<script lang="ts">
  import type { Card } from "$lib/types.ts";

  let { cards, onclose }: { cards: Card[]; onclose: () => void } = $props();

  let grouped = $derived.by(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const groups: { label: string; cards: Card[] }[] = [];
    const now = Date.now();

    for (const card of cards) {
      if (!card.doneAt) continue;
      const date = new Date(card.doneAt);
      date.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      let label: string;
      if (diff === 0) label = "Today";
      else if (diff === 1) label = "Yesterday";
      else if (diff < 7) label = `${diff} days ago`;
      else label = date.toLocaleDateString();

      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, cards: [] };
        groups.push(group);
      }
      group.cards.push(card);
    }
    return groups;
  });
</script>

<div class="overlay" onclick={onclose} role="dialog" tabindex="-1">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="dialog review-dialog" onclick={(e) => e.stopPropagation()} role="presentation">
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
                {#if card.tags.length > 0}
                  <span class="review-tags">
                    {#each card.tags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    </div>

    <div class="dialog-actions">
      <button type="button" class="btn primary" onclick={onclose}>Close</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 10px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .review-dialog {
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
    color: #e94560;
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
    color: #555;
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
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .review-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    background: #1a1a2e;
    border-radius: 6px;
  }

  .review-name {
    font-size: 14px;
    color: #ccc;
  }

  .review-tags {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .tag {
    font-size: 10px;
    background: #0f3460;
    color: #88b4e0;
    border-radius: 4px;
    padding: 2px 6px;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .btn {
    padding: 8px 16px;
    border: 1px solid #0f3460;
    border-radius: 6px;
    background: transparent;
    color: #ccc;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .btn:hover {
    background: #1e2a4a;
  }

  .btn.primary {
    background: #e94560;
    border-color: #e94560;
    color: #fff;
  }

  .btn.primary:hover {
    background: #d63851;
  }
</style>
