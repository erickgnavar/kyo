<script lang="ts">
  import CommentSection from "$lib/CommentSection.svelte";
  import { handleMarkdownClick } from "$lib/links";
  import Overlay from "$lib/Overlay.svelte";
  import { marked } from "marked";
  import type { Card } from "$lib/types.ts";
  import type { CardStore } from "$lib/card-store";

  let {
    card,
    columns,
    store,
    onclose,
    onedit,
    ondone,
  }: {
    card: Card;
    columns: { id: string; title: string }[];
    store: CardStore;
    onclose: () => void;
    onedit: () => void;
    ondone?: () => void;
  } = $props();

  let html = $derived(card.content ? marked.parse(card.content) : "");
  let isReadonly = $derived(!!card.archived || !!card.doneAt);
</script>

<Overlay {onclose} class="card-dialog">
  <!-- header -->
  <div class="header">
    <h3>{card.name}</h3>
    <span class="col-badge">{columns.find((c) => c.id === card.column)?.title}</span>
  </div>

  <!-- body: main + sidebar -->
  <div class="body">
    <div class="main">
      {#if html}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="content markdown" onclick={handleMarkdownClick}>{@html html}</div>
      {:else}
        <p class="content empty-content">No description</p>
      {/if}

      <CommentSection cardId={card.id} {store} {isReadonly} />
    </div>

    <div class="sidebar">
      {#if card.tags.length > 0}
        <div class="meta-block">
          <span>Tags</span>
          <div class="tags">
            {#each card.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </div>
      {/if}

      {#if card.dueDate}
        <div class="meta-block">
          <span>Due date</span>
          <span class="due-date">{card.dueDate}</span>
        </div>
      {/if}

      <div class="meta-block">
        <span>Carried over</span>
        <span class="score">{card.score ?? 0} ×</span>
      </div>

      <div class="meta-block">
        <span>Created</span>
        <span class="date">{new Date(card.createdAt).toLocaleDateString()}</span>
      </div>
      {#if card.doneAt}
        <div class="meta-block">
          <span>Done</span>
          <span class="date">{new Date(card.doneAt).toLocaleDateString()}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- actions -->
  <div class="dialog-actions">
    <button type="button" class="btn" onclick={onclose}>Close</button>
    <div>
      {#if !isReadonly}
        <button type="button" class="btn" onclick={ondone}>
          Done <kbd class="kbd-inline">x</kbd>
        </button>
        <button type="button" class="btn" onclick={onedit}>
          Edit <kbd class="kbd-inline">e</kbd>
        </button>
      {/if}
    </div>
  </div>
</Overlay>

<style>
  :global(.card-dialog) {
    width: 90%;
    max-width: 1024px;
    max-height: 80vh;
  }

  /* --- header --- */
  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
    word-break: break-word;
  }

  .col-badge {
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* --- body: two columns --- */
  .body {
    display: flex;
    gap: 24px;
    min-height: 0;
    flex: 1;
  }

  .main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }

  .content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
    white-space: pre-wrap;
    margin: 0 0 20px 0;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }

  .empty-content {
    font-size: 13px;
    color: var(--text-empty);
    font-style: italic;
  }

  .sidebar {
    width: 160px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .meta-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-block span {
    font-size: 10px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    font-size: 11px;
    background: var(--border);
    color: var(--tag-text);
    border-radius: 4px;
    padding: 2px 6px;
  }

  .due-date {
    font-size: 13px;
    color: var(--accent);
  }

  .score {
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
  }

  .date {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* --- actions --- */
  .dialog-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    flex-shrink: 0;
  }

  .dialog-actions > div {
    display: flex;
    gap: 8px;
  }

  .kbd-inline {
    font-size: 11px;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0 4px;
    margin-left: 4px;
    color: var(--text-dim);
  }
  .btn.primary .kbd-inline {
    background: rgba(0, 0, 0, 0.25);
    border-color: rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.55);
  }
</style>
