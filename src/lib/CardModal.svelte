<script lang="ts">
  import { handleMarkdownClick } from "$lib/links";
  import { marked } from "marked";
  import type { Card, ColumnId } from "$lib/types.ts";

  let {
    card,
    columns,
    onclose,
    onedit,
    ondone,
  }: {
    card: Card;
    columns: { id: string; title: string }[];
    onclose: () => void;
    onedit: () => void;
    ondone?: () => void;
  } = $props();

  let html = $derived(card.content ? marked.parse(card.content) : "");
  let isReadonly = $derived(!!card.archived || !!card.doneAt);
</script>

<div class="overlay" onclick={onclose} role="dialog" tabindex="-1">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="dialog card-dialog" onclick={(e) => e.stopPropagation()} role="presentation">
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
          <p class="empty-content">No description</p>
        {/if}
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
      </div>
    </div>

    <!-- actions -->
    <div class="dialog-actions">
      <button type="button" class="btn" onclick={onclose}>Close</button>
      <div>
        <button type="button" class="btn primary" onclick={ondone} disabled={isReadonly}>
          Done <kbd class="kbd-inline">x</kbd>
        </button>
        <button type="button" class="btn" onclick={onedit} disabled={isReadonly}>
          Edit <kbd class="kbd-inline">e</kbd>
        </button>
      </div>
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

  .card-dialog {
    min-width: 600px;
    max-width: 680px;
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
    color: #e94560;
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
    color: #ccc;
    white-space: pre-wrap;
    margin: 0;
  }

  .empty-content {
    font-size: 13px;
    color: #555;
    font-style: italic;
    margin: 0;
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
    color: #888;
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
    background: #0f3460;
    color: #88b4e0;
    border-radius: 4px;
    padding: 2px 6px;
  }

  .due-date {
    font-size: 13px;
    color: #e94560;
  }

  .score {
    font-size: 13px;
    font-weight: 700;
    color: #e94560;
  }

  .date {
    font-size: 13px;
    color: #ccc;
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

  .btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .kbd-inline {
    font-size: 11px;
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 3px;
    padding: 0 4px;
    margin-left: 4px;
  }
</style>
