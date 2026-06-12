<script lang="ts">
  import { handleMarkdownClick } from "$lib/links";
  import { marked } from "marked";
  import type { Card, Comment } from "$lib/types.ts";
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

  // --- comments ---
  let comments: Comment[] = $state([]);
  // Unified draft state: editingCommentId=null means creating a new comment
  let editingCommentId: string | null = $state(null);
  let draftBody = $state("");
  let draftPreview = $state(false);

  async function loadComments() {
    comments = await store.getComments(card.id);
  }

  async function submitDraft() {
    const body = draftBody.trim();
    if (!body) return;
    if (editingCommentId) {
      await store.updateComment(editingCommentId, body);
    } else {
      await store.addComment(card.id, body);
    }
    resetDraft();
    await loadComments();
  }

  function resetDraft() {
    editingCommentId = null;
    draftBody = "";
    draftPreview = false;
  }

  function startEdit(comment: Comment) {
    editingCommentId = comment.id;
    draftBody = comment.body;
    draftPreview = false;
  }

  async function deleteComment(commentId: string) {
    await store.deleteComment(commentId);
    await loadComments();
  }

  // Load comments on mount / card change, reset draft
  $effect(() => {
    void card;
    loadComments();
    resetDraft();
  });

  function onDraftKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitDraft();
    }
    if (e.key === "Escape") {
      resetDraft();
    }
    if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      draftPreview = !draftPreview;
    }
  }
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
          <p class="content empty-content">No description</p>
        {/if}

        <!-- comments section -->
        <div class="comments-section">
          <h4 class="comments-heading">Comments ({comments.length})</h4>

          {#each comments as comment (comment.id)}
            <div class="comment">
              {#if editingCommentId === comment.id}
                {#if draftPreview}
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <div class="comment-body markdown" onclick={handleMarkdownClick}>
                    {@html marked.parse(draftBody)}
                  </div>
                {:else}
                  <textarea
                    class="comment-input"
                    bind:value={draftBody}
                    placeholder="Edit comment (Markdown)"
                    rows="3"
                    onkeydown={onDraftKeydown}
                  ></textarea>
                {/if}
                <div class="comment-actions">
                  <button
                    type="button"
                    class="btn small"
                    onclick={() => (draftPreview = !draftPreview)}
                  >
                    {draftPreview ? "Edit" : "Preview"}
                  </button>
                  <button type="button" class="btn small" onclick={resetDraft}>Cancel</button>
                  <button
                    type="button"
                    class="btn small primary"
                    onclick={submitDraft}
                    disabled={!draftBody.trim()}
                  >
                    Save
                  </button>
                </div>
              {:else}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="comment-body markdown" onclick={handleMarkdownClick}>
                  {@html marked.parse(comment.body)}
                </div>
                <div class="comment-meta">
                  <span class="comment-time">
                    {new Date(comment.createdAt).toLocaleString()}
                    {#if comment.editedAt}
                      (edited)
                    {/if}
                  </span>
                  {#if !isReadonly}
                    <span class="comment-actions">
                      <button type="button" class="btn tiny" onclick={() => startEdit(comment)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        class="btn tiny danger"
                        onclick={() => deleteComment(comment.id)}
                      >
                        Delete
                      </button>
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}

          {#if !isReadonly}
            <div class="comment-new">
              {#if editingCommentId === null && draftPreview}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="comment-body markdown" onclick={handleMarkdownClick}>
                  {@html marked.parse(draftBody)}
                </div>
              {/if}
              {#if editingCommentId === null && !draftPreview}
                <textarea
                  class="comment-input"
                  bind:value={draftBody}
                  placeholder="Add a comment (Markdown)"
                  rows="3"
                  onkeydown={onDraftKeydown}
                ></textarea>
              {/if}
              <div class="comment-actions">
                <button
                  type="button"
                  class="btn small"
                  onclick={() => (draftPreview = !draftPreview)}
                  disabled={!draftBody.trim() && editingCommentId === null}
                >
                  {draftPreview ? "Edit" : "Preview"}
                </button>
                <button
                  type="button"
                  class="btn small primary"
                  onclick={submitDraft}
                  disabled={!draftBody.trim()}
                >
                  Add Comment
                </button>
              </div>
            </div>
          {/if}
        </div>
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

  /* --- comments --- */
  .comments-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .comments-heading {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .comment {
    padding: 10px 12px;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .comment-body {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .comment-body.markdown :global(h1),
  .comment-body.markdown :global(h2),
  .comment-body.markdown :global(h3) {
    margin: 8px 0 4px;
    font-size: 14px;
  }

  .comment-body.markdown :global(p) {
    margin: 0 0 4px;
    font-size: 13px;
  }

  .comment-body.markdown :global(ul),
  .comment-body.markdown :global(ol) {
    margin: 0 0 4px;
    padding-left: 16px;
  }

  .comment-body.markdown :global(code) {
    font-size: 11px;
  }

  .comment-body.markdown :global(pre) {
    padding: 8px;
    margin: 4px 0;
  }

  .comment-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .comment-time {
    font-size: 11px;
    color: #555;
  }

  .comment-actions {
    display: flex;
    gap: 6px;
  }

  .comment-input {
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
    font-size: 13px;
    outline: none;
    resize: vertical;
  }

  .comment-input:focus {
    border-color: var(--accent);
  }

  .comment-new {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 4px;
  }

  .btn.small {
    padding: 4px 10px;
    font-size: 12px;
  }

  .btn.tiny {
    padding: 2px 8px;
    font-size: 11px;
  }

  .btn.danger {
    color: var(--accent);
  }

  .btn.danger:hover {
    background: rgba(233, 69, 96, 0.15);
  }

  .btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
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

  .btn {
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .btn:hover {
    background: var(--bg-hover);
  }

  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--text);
  }

  .btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .kbd-inline {
    font-size: 11px;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0 4px;
    margin-left: 4px;
  }
</style>
