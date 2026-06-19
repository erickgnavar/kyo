<script lang="ts">
  import { timeAgo } from "$lib/dates";
  import { handleMarkdownClick } from "$lib/links";
  import { marked } from "marked";
  import type { Comment } from "$lib/types.ts";
  import type { CardStore } from "$lib/card-store";

  let {
    cardId,
    store,
    isReadonly = false,
  }: {
    cardId: string;
    store: CardStore;
    isReadonly?: boolean;
  } = $props();

  let comments: Comment[] = $state([]);
  let editingCommentId: string | null = $state(null);
  let draftBody = $state("");
  let draftPreview = $state(false);

  async function loadComments() {
    comments = await store.getComments(cardId);
  }

  async function submitDraft() {
    const body = draftBody.trim();
    if (!body) return;
    if (editingCommentId) {
      await store.updateComment(editingCommentId, body);
    } else {
      await store.addComment(cardId, body);
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

  $effect(() => {
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
          <button type="button" class="btn small" onclick={() => (draftPreview = !draftPreview)}>
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
            <kbd class="kbd-inline">⌘Enter</kbd>
          </button>
        </div>
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="comment-body markdown" onclick={handleMarkdownClick}>
          {@html marked.parse(comment.body)}
        </div>
        <div class="comment-meta">
          <span class="comment-time">
            {timeAgo(comment.createdAt)}
            {#if comment.editedAt}
              · edited {timeAgo(comment.editedAt)}
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
          <kbd class="kbd-inline">⌘Enter</kbd>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
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
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .comment-body {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
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
    color: var(--text-empty);
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
    background: var(--on-accent-chip);
    border-color: var(--on-accent-chip);
    color: var(--on-accent-soft);
  }
</style>
