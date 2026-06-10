<script lang="ts">
  import type { Card } from "$lib/types.ts";

  let {
    title,
    cards,
    onclose,
    restore,
    label = "Restore",
    secondaryRestore,
    secondaryLabel,
  }: {
    title: string;
    cards: Card[];
    onclose: () => void;
    restore: (card: Card) => void;
    label?: string;
    secondaryRestore?: (card: Card) => void;
    secondaryLabel?: string;
  } = $props();
</script>

<div
  class="overlay"
  onclick={onclose}
  onkeydown={(e) => e.key === "Escape" && onclose()}
  role="dialog"
  tabindex="-1"
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="dialog archived-dialog" onclick={(e) => e.stopPropagation()} role="presentation">
    <h3>{title}</h3>

    {#if cards.length === 0}
      <p class="empty">no cards</p>
    {:else}
      <div class="list">
        {#each cards as card (card.id)}
          <div class="item">
            <div class="item-name">{card.name}</div>
            {#if card.tags.length > 0}
              <div class="tags">
                {#each card.tags as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            {/if}
            <div class="actions">
              <button type="button" class="btn primary small" onclick={() => restore(card)}>
                {label}
              </button>
              {#if secondaryRestore}
                <button type="button" class="btn small" onclick={() => secondaryRestore(card)}>
                  {secondaryLabel}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <button type="button" class="btn primary" onclick={onclose}>Close</button>
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
    gap: 14px;
  }

  .archived-dialog {
    min-width: 420px;
    max-height: 70vh;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 50vh;
    overflow-y: auto;
  }

  .item {
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 6px;
    padding: 10px 12px;
    opacity: 0.7;
  }

  .item-name {
    font-weight: 500;
    font-size: 14px;
    color: #aaa;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .tag {
    font-size: 11px;
    background: #0f3460;
    color: #88b4e0;
    border-radius: 4px;
    padding: 1px 6px;
  }

  .actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
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

  .btn.small {
    padding: 4px 10px;
    font-size: 11px;
  }

  .empty {
    text-align: center;
    color: #555;
    font-size: 12px;
    padding: 20px 0;
  }
</style>
