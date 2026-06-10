<script lang="ts">
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
          <div class="content markdown">{@html html}</div>
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
        <button type="button" class="btn primary" onclick={ondone}>
          Done <kbd class="kbd-inline">x</kbd>
        </button>
        <button type="button" class="btn" onclick={onedit}>
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

  :global(.markdown h1),
  :global(.markdown h2),
  :global(.markdown h3) {
    margin: 16px 0 8px;
    color: #e0e0e0;
  }
  :global(.markdown h1) {
    font-size: 18px;
  }
  :global(.markdown h2) {
    font-size: 16px;
  }
  :global(.markdown h3) {
    font-size: 14px;
  }
  :global(.markdown p) {
    margin: 0 0 8px;
  }
  :global(.markdown ul),
  :global(.markdown ol) {
    margin: 0 0 8px;
    padding-left: 20px;
  }
  :global(.markdown li) {
    margin-bottom: 2px;
  }
  :global(.markdown code) {
    font-size: 12px;
    background: #1a1a2e;
    border-radius: 3px;
    padding: 1px 4px;
  }
  :global(.markdown pre) {
    background: #1a1a2e;
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    margin: 8px 0;
  }
  :global(.markdown pre code) {
    background: none;
    padding: 0;
  }
  :global(.markdown a) {
    color: #66b3ff;
    text-decoration: underline;
  }
  :global(.markdown a:hover) {
    color: #99ccff;
  }
  :global(.markdown table) {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 13px;
  }
  :global(.markdown th),
  :global(.markdown td) {
    border: 1px solid #0f3460;
    padding: 6px 10px;
    text-align: left;
  }
  :global(.markdown th) {
    background: #1a1a2e;
    color: #e0e0e0;
    font-weight: 600;
  }
  :global(.markdown td) {
    color: #ccc;
  }
  :global(.markdown tr:nth-child(even)) {
    background: rgba(255, 255, 255, 0.02);
  }
  :global(.markdown blockquote) {
    border-left: 3px solid #0f3460;
    margin: 8px 0;
    padding: 4px 12px;
    color: #aaa;
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

  .btn.primary:hover {
    background: #d63851;
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
