<script lang="ts">
  import type { Card, ColumnId } from "$lib/types.ts";

  let { card, columns, onclose, onedit, ondone }: {
    card: Card;
    columns: { id: ColumnId; title: string }[];
    onclose: () => void;
    onedit: () => void;
    ondone?: () => void;
  } = $props();
</script>

<div class="overlay" onclick={onclose}>
  <div class="dialog card-dialog" onclick={(e) => e.stopPropagation()}>
    <div class="card-dialog-header">
      <h3>{card.name}</h3>
      <span class="card-dialog-col">{columns.find((c) => c.id === card.column)?.title}</span>
    </div>

    {#if card.content}
      <div class="card-dialog-section">
        <label>Content</label>
        <p class="card-dialog-content">{card.content}</p>
      </div>
    {/if}

    {#if card.tags.length > 0}
      <div class="card-dialog-section">
        <label>Tags</label>
        <div class="tags">
          {#each card.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      </div>
    {/if}

    {#if card.dueDate}
      <div class="card-dialog-section">
        <label>Due date</label>
        <span class="due-date">{card.dueDate}</span>
      </div>
    {/if}

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
    gap: 14px;
  }

  .card-dialog {
    min-width: 480px;
    max-width: 540px;
  }

  .card-dialog-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 4px;
  }

  .card-dialog-header h3 {
    margin: 0;
    font-size: 17px;
  }

  .card-dialog-col {
    font-size: 11px;
    color: #e94560;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-dialog-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-dialog-section label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .card-dialog-content {
    font-size: 14px;
    line-height: 1.5;
    color: #ccc;
    white-space: pre-wrap;
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

  .due-date {
    display: inline-block;
    font-size: 11px;
    color: #e94560;
  }

  .dialog-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
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
