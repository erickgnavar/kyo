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
    oncardclick,
  }: {
    title: string;
    cards: Card[];
    onclose: () => void;
    restore: (card: Card) => void;
    label?: string;
    secondaryRestore?: (card: Card) => void;
    secondaryLabel?: string;
    oncardclick?: (card: Card) => void;
  } = $props();
</script>

<div class="overlay" onclick={onclose} role="dialog" tabindex="-1">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="dialog archived-dialog" onclick={(e) => e.stopPropagation()} role="presentation">
    <h3>{title}</h3>

    {#if cards.length === 0}
      <p class="empty">no cards</p>
    {:else}
      <div class="list">
        {#each cards as card (card.id)}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="item" class:clickable={!!oncardclick} onclick={() => oncardclick?.(card)}>
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
    background: var(--overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
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
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    opacity: 0.7;
  }

  .item.clickable {
    cursor: pointer;
  }

  .item.clickable:hover {
    background: var(--bg-hover);
    opacity: 1;
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
    background: var(--border);
    color: var(--tag-text);
    border-radius: 4px;
    padding: 1px 6px;
  }

  .actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .empty {
    text-align: center;
    color: var(--text-empty);
    font-size: 12px;
    padding: 20px 0;
  }
</style>
