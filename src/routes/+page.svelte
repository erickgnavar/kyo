<script lang="ts">
  import "../app.css";
  import CardForm from "$lib/CardForm.svelte";
  import CardListOverlay from "$lib/CardListOverlay.svelte";
  import CardModal from "$lib/CardModal.svelte";
  import CommandPalette from "$lib/CommandPalette.svelte";
  import WeeklyReview from "$lib/WeeklyReview.svelte";
  import { relativeTime } from "$lib/dates";
  import { handleMarkdownClick } from "$lib/links";
  import { marked } from "marked";
  import type { CardStore } from "$lib/card-store";
  import { createTauriCardStore } from "$lib/card-store-tauri";
  import type { Card, ColumnId } from "$lib/types.ts";

  type ColumnView = { id: string; title: string };

  const COLUMNS: ColumnView[] = [
    { id: "backlog", title: "Backlog" },
    { id: "today", title: "Today" },
    { id: "upcoming", title: "Upcoming" },
  ];

  // --- data store ---
  const store: CardStore & { init: () => Promise<void> } = createTauriCardStore();

  let cards: Card[] = $state(store.cards);

  let grouped: Record<string, Card[]> = $derived({
    backlog: cards
      .filter((c) => c.column === "backlog" && !c.archived && !c.doneAt)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    today: cards.filter((c) => c.column === "today" && !c.archived && !c.doneAt),
    upcoming: cards
      .filter((c) => c.column === "backlog" && c.dueDate && !c.archived && !c.doneAt)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
  });
  let archivedCards = $derived(cards.filter((c) => c.archived && !c.doneAt));
  let doneCards = $derived(cards.filter((c) => !!c.doneAt));
  let allTags = $derived([...new Set(cards.flatMap((c) => c.tags ?? []))].sort());

  // keep local snapshot in sync with store + initial load from backend
  $effect(() => {
    const unsub = store.onUpdate(() => {
      cards = store.cards;
    });
    store.init();
    return unsub;
  });

  // --- UI state ---
  let colIdx = $state(1);
  let rowIdx = $state(0);
  let showCardModal = $state(false);
  let viewingCardId: string | null = $state<string | null>(null);
  let showHelp = $state(false);
  let showNewDialog = $state(false);
  let showEditDialog = $state(false);
  let showArchived = $state(false);
  let showDone = $state(false);
  let showCommandPalette = $state(false);
  let showWeeklyReview = $state(false);
  let weeklyReviewCards = $state<Card[]>([]);
  let editPreview = $state(false);

  // form fields (shared between new & edit via CardForm bindings)
  let formName = $state("");
  let formContent = $state("");
  let formTags = $state("");
  let formDueDate = $state("");

  // edit-specific
  let editId: string | null = $state<string | null>(null);

  // --- derived ---
  let visibleCards: Card[] = $derived(grouped[COLUMNS[colIdx].id] ?? []);

  $effect(() => {
    if (rowIdx >= visibleCards.length) {
      rowIdx = Math.max(0, visibleCards.length - 1);
    }
  });

  // scroll selected card into view
  $effect(() => {
    // depend on rowIdx and colIdx to re-run on change
    void visibleCards;
    const r = rowIdx;
    const c = colIdx;
    requestAnimationFrame(() => {
      document.querySelector(".card.selected")?.scrollIntoView({ block: "nearest" });
    });
  });

  // --- helpers ---
  function cardsFor(colId: string): Card[] {
    return grouped[colId] ?? [];
  }

  async function openWeeklyReview() {
    weeklyReviewCards = await store.getWeeklyReview();
    showWeeklyReview = true;
  }

  function resetForm() {
    formName = "";
    formContent = "";
    formTags = "";
    formDueDate = "";
  }

  // --- navigation ---
  function openEditFor(card: Card) {
    editId = card.id;
    formName = card.name;
    formContent = card.content;
    formTags = card.tags.join(", ");
    formDueDate = card.dueDate || "";
    showEditDialog = true;
  }

  async function submitEdit() {
    if (!editId || !formName.trim()) return;
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await store.update(editId, {
      name: formName.trim(),
      content: formContent.trim(),
      tags,
      dueDate: formDueDate || "",
    });
    showEditDialog = false;
    editId = null;
  }

  async function submitNewCard() {
    const name = formName.trim();
    if (!name) return;
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await store.add("backlog", name, formContent.trim(), tags, formDueDate || undefined);
    showNewDialog = false;
    colIdx = COLUMNS.findIndex((c) => c.id === "backlog");
    rowIdx = store.getByColumn("backlog").length - 1;
  }

  function isEditingText(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "textarea" || tag === "input") return true;
    // Also check contenteditable
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  }

  async function onKey(e: KeyboardEvent) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (
      showNewDialog ||
      showEditDialog ||
      showHelp ||
      showArchived ||
      showCardModal ||
      showDone ||
      showCommandPalette ||
      showWeeklyReview
    ) {
      if (key === "Escape" || key === "escape") {
        showNewDialog = false;
        showEditDialog = false;
        showHelp = false;
        showArchived = false;
        showCardModal = false;
        showDone = false;
        showCommandPalette = false;
        showWeeklyReview = false;
        viewingCardId = null;
      }
      if (showNewDialog && (key === "Enter" || key === "enter") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        await submitNewCard();
      }
      if (showEditDialog && (key === "Enter" || key === "enter") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        await submitEdit();
      }
      if (showEditDialog && (key === "p" || key === "P") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        editPreview = !editPreview;
      }
      if (showCardModal && key === "e" && !isEditingText()) {
        e.preventDefault();
        const card = cards.find((c) => c.id === viewingCardId);
        if (card && !card.archived && !card.doneAt) {
          showCardModal = false;
          openEditFor(card);
        }
      }
      if (showCardModal && key === "x" && !isEditingText()) {
        e.preventDefault();
        const card = cards.find((c) => c.id === viewingCardId);
        if (card && !card.archived && !card.doneAt) {
          await store.markDone(card.id);
          showCardModal = false;
          viewingCardId = null;
        }
      }
      return;
    }

    switch (key) {
      case "j":
        e.preventDefault();
        if (e.shiftKey) {
          if (visibleCards[rowIdx] && rowIdx < visibleCards.length - 1) {
            await store.moveWithinColumn(visibleCards[rowIdx].id, 1);
            rowIdx += 1;
          }
        } else {
          if (visibleCards.length > 0) rowIdx = Math.min(rowIdx + 1, visibleCards.length - 1);
        }
        break;
      case "k":
        e.preventDefault();
        if (e.shiftKey) {
          if (visibleCards[rowIdx] && rowIdx > 0) {
            await store.moveWithinColumn(visibleCards[rowIdx].id, -1);
            rowIdx -= 1;
          }
        } else {
          rowIdx = Math.max(0, rowIdx - 1);
        }
        break;
      case "h":
      case "ArrowLeft":
        e.preventDefault();
        colIdx = Math.max(0, colIdx - 1);
        rowIdx = 0;
        break;
      case "l":
      case "ArrowRight":
        e.preventDefault();
        colIdx = Math.min(colIdx + 1, COLUMNS.length - 1);
        rowIdx = 0;
        break;
      case "t":
        e.preventDefault();
        if (visibleCards[rowIdx]) await store.moveToColumn(visibleCards[rowIdx].id, "today");
        break;
      case "b":
        e.preventDefault();
        if (visibleCards[rowIdx]) await store.moveToColumn(visibleCards[rowIdx].id, "backlog");
        break;
      case "Enter":
        e.preventDefault();
        if (visibleCards[rowIdx]) {
          viewingCardId = visibleCards[rowIdx].id;
          showCardModal = true;
        }
        break;
      case "d":
        e.preventDefault();
        if (visibleCards[rowIdx]) await store.archive(visibleCards[rowIdx].id);
        break;
      case "x":
        e.preventDefault();
        if (visibleCards[rowIdx]) await store.markDone(visibleCards[rowIdx].id);
        break;
      case "a":
        e.preventDefault();
        showArchived = !showArchived;
        break;
      case "e":
        e.preventDefault();
        if (visibleCards[rowIdx]) openEditFor(visibleCards[rowIdx]);
        break;
      case "n":
        e.preventDefault();
        resetForm();
        showNewDialog = true;
        break;
      case "?":
        e.preventDefault();
        showHelp = !showHelp;
        break;
    }

    // Cmd+K (Meta on Mac, Ctrl on Linux/Windows)
    if (key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      showCommandPalette = true;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="app">
  <!-- header -->
  <header class="header">
    <h1><img src="/icon.svg" class="app-icon" alt="" /> kyo</h1>
    <span class="shortcut-hint">
      <kbd>?</kbd>
      help
      <kbd>n</kbd>
      new card
      <button class="archive-btn" onclick={() => (showArchived = !showArchived)}>
        archived ({archivedCards.length})
      </button>
      <button class="archive-btn" onclick={() => (showDone = !showDone)}>
        done ({doneCards.length})
      </button>
    </span>
  </header>

  <!-- columns -->
  <div class="columns">
    {#each COLUMNS as col, ci}
      <div class="column" class:active={ci === colIdx}>
        <div class="column-header">
          <h2>{col.title}</h2>
          <span class="count">{cardsFor(col.id).length}</span>
        </div>
        <div class="card-list">
          {#each cardsFor(col.id) as card, ri (card.id)}
            <button
              class="card"
              class:working={col.id === "today" && ri === 0}
              class:selected={ci === colIdx && ri === rowIdx}
              onclick={() => { colIdx = ci; rowIdx = ri; viewingCardId = card.id; showCardModal = true; }}
            >
              <div class="card-row">
                <div class="card-name">{card.name}</div>
                {#if col.id === "upcoming" && card.dueDate}
                  <div class="card-due">{relativeTime(card.dueDate)}</div>
                {/if}
              </div>
            </button>
          {:else}
            <div class="empty">no cards</div>
          {/each}
        </div>
        {#if col.id === "backlog"}
          <button
            type="button"
            class="add-btn"
            onclick={() => { resetForm(); showNewDialog = true; }}
          >
            + Add to Backlog
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <!-- footer -->
  <footer class="footer">
    <span><kbd>j</kbd><kbd>k</kbd> nav</span>
    <span><kbd>⇧J</kbd><kbd>⇧K</kbd> reorder</span>
    <span><kbd>h</kbd><kbd>l</kbd> focus column</span>
    <span><kbd>t</kbd> today</span>
    <span><kbd>b</kbd> backlog</span>
    <span><kbd>Enter</kbd> open</span>
    <span><kbd>e</kbd> edit</span>
    <span><kbd>x</kbd> done</span>
    <span><kbd>d</kbd> archive</span>
    <span><kbd>a</kbd> archived ({archivedCards.length})</span>
  </footer>
</div>

<!-- new card dialog -->
{#if showNewDialog}
  <div class="overlay" onclick={() => (showNewDialog = false)} role="dialog" tabindex="-1">
    <div class="dialog" onclick={(e) => e.stopPropagation()} role="presentation">
      <h3>New Card</h3>
      <CardForm
        bind:name={formName}
        bind:content={formContent}
        bind:tags={formTags}
        bind:dueDate={formDueDate}
        suggestions={allTags}
      />
      <div class="dialog-actions">
        <button type="button" class="btn" onclick={() => (showNewDialog = false)}>Cancel</button>
        <button type="button" class="btn primary" onclick={submitNewCard}>
          Create
          <span class="shortcut-hint"
            >{navigator.platform.includes("Mac") ? "⌘Enter" : "Ctrl+Enter"}</span
          >
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- edit dialog -->
{#if showEditDialog}
  <div class="overlay" onclick={() => (showEditDialog = false)} role="dialog" tabindex="-1">
    <div class="dialog edit-dialog" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="edit-header">
        <h3>Edit Card</h3>
        <button type="button" class="btn small" onclick={() => (editPreview = !editPreview)}>
          {editPreview ? "Edit" : "Preview"}
          <span class="shortcut-hint">{navigator.platform.includes("Mac") ? "⌘P" : "Ctrl+P"}</span>
        </button>
      </div>

      {#if editPreview}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="edit-preview markdown" onclick={handleMarkdownClick}>
          {#if formContent.trim()}
            {@html marked.parse(formContent)}
          {:else}
            <p class="empty-content">No description</p>
          {/if}
        </div>
      {:else}
        <CardForm
          bind:name={formName}
          bind:content={formContent}
          bind:tags={formTags}
          bind:dueDate={formDueDate}
          editMode
          suggestions={allTags}
        />
      {/if}

      <div class="dialog-actions">
        <button type="button" class="btn" onclick={() => (showEditDialog = false)}>Cancel</button>
        <button type="button" class="btn primary" onclick={submitEdit}>
          Save
          <span class="shortcut-hint"
            >{navigator.platform.includes("Mac") ? "⌘Enter" : "Ctrl+Enter"}</span
          >
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- card modal -->
{#if showCardModal && viewingCardId}
  {@const card = cards.find((c) => c.id === viewingCardId)}
  {#if card}
    <CardModal
      {card}
      columns={COLUMNS}
      {store}
      onclose={() => { showCardModal = false; viewingCardId = null; }}
      onedit={() => { showCardModal = false; openEditFor(card); }}
      ondone={async () => { await store.markDone(card.id); showCardModal = false; viewingCardId = null; }}
    />
  {/if}
{/if}

{#if showCommandPalette}
  <CommandPalette
    {cards}
    columnTitles={{ backlog: "Backlog", today: "Today", upcoming: "Upcoming" }}
    onclose={() => (showCommandPalette = false)}
    onEndOfDay={async () => { await store.endOfDay() }}
    onCardSelect={(id) => { viewingCardId = id; showCardModal = true; }}
    onViewArchived={() => (showArchived = true)}
    onViewDone={() => (showDone = true)}
    onWeeklyReview={openWeeklyReview}
  />
{/if}

<!-- weekly review -->
{#if showWeeklyReview}
  <WeeklyReview cards={weeklyReviewCards} onclose={() => (showWeeklyReview = false)} />
{/if}

<!-- help -->
{#if showHelp}
  <div class="overlay" onclick={() => (showHelp = false)} role="dialog" tabindex="-1">
    <div class="dialog help-dialog" onclick={(e) => e.stopPropagation()} role="presentation">
      <h3>Keyboard Shortcuts</h3>
      <table>
        <tbody>
          <tr>
            <td><kbd>j</kbd> / <kbd>k</kbd></td>
            <td>Move selection up / down</td>
          </tr>
          <tr>
            <td><kbd>⇧J</kbd></td>
            <td>Move card down in list</td>
          </tr>
          <tr>
            <td><kbd>⇧K</kbd></td>
            <td>Move card up in list</td>
          </tr>
          <tr>
            <td><kbd>h</kbd> / <kbd>l</kbd></td>
            <td>Focus column left / right</td>
          </tr>
          <tr>
            <td><kbd>t</kbd></td>
            <td>Move card to <strong>Today</strong></td>
          </tr>
          <tr>
            <td><kbd>b</kbd></td>
            <td>Move card to <strong>Backlog</strong></td>
          </tr>
          <tr>
            <td><kbd>Enter</kbd></td>
            <td>Open card (read-only)</td>
          </tr>
          <tr>
            <td><kbd>e</kbd> (in card)</td>
            <td>Switch to edit mode</td>
          </tr>
          <tr>
            <td><kbd>e</kbd></td>
            <td>Edit card</td>
          </tr>
          <tr>
            <td><kbd>x</kbd></td>
            <td>Mark card done</td>
          </tr>
          <tr>
            <td><kbd>d</kbd></td>
            <td>Archive card</td>
          </tr>
          <tr>
            <td><kbd>a</kbd></td>
            <td>Toggle archived view</td>
          </tr>
          <tr>
            <td><kbd>n</kbd></td>
            <td>New card</td>
          </tr>
          <tr>
            <td><kbd>?</kbd></td>
            <td>Toggle this help</td>
          </tr>
        </tbody>
      </table>
      <button class="btn primary" onclick={() => (showHelp = false)}>Close</button>
    </div>
  </div>
{/if}

<!-- archived overlay -->
{#if showArchived}
  <CardListOverlay
    title="Archived Cards ({archivedCards.length})"
    cards={archivedCards}
    onclose={() => (showArchived = false)}
    restore={async (c) => { await store.restore(c.id, "backlog") }}
    label="Restore to Backlog"
    secondaryRestore={async (c) => { await store.restore(c.id, "today") }}
    secondaryLabel="Restore to Today"
    oncardclick={(c) => { showArchived = false; viewingCardId = c.id; showCardModal = true; }}
  />
{/if}

<!-- done overlay -->
{#if showDone}
  <CardListOverlay
    title="Done Cards ({doneCards.length})"
    cards={doneCards}
    onclose={() => (showDone = false)}
    restore={async (c) => { await store.unmarkDone(c.id) }}
    oncardclick={(c) => { showDone = false; viewingCardId = c.id; showCardModal = true; }}
  />
{/if}

<style>
  /* --- reset / global --- */
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  :global(body) {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: var(--text);
    background: var(--bg-base);
    overflow: hidden;
    height: 100vh;
  }
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  /* --- header --- */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .app-icon {
    width: 20px;
    height: 20px;
    color: var(--accent);
  }
  .shortcut-hint {
    font-size: 12px;
    color: var(--text-dim);
  }
  .shortcut-hint kbd {
    margin: 0 2px 0 6px;
  }

  /* --- columns --- */
  .columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 12px;
    flex: 1;
    min-height: 0;
  }
  .column {
    display: flex;
    flex-direction: column;
    background: var(--bg-elevated);
    border-radius: 8px;
    border: 1px solid var(--border);
    overflow: hidden;
    opacity: 0.45;
    transition: opacity 0.1s;
  }
  .column.active {
    border-color: var(--accent);
    opacity: 1;
  }
  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--bg-base);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .column-header h2 {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .count {
    font-size: 12px;
    background: var(--border);
    color: #aaa;
    border-radius: 10px;
    padding: 1px 8px;
  }

  /* --- card list --- */
  .card-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }
  .card:hover {
    background: var(--bg-hover);
  }
  .card.selected {
    border-color: var(--accent);
    background: var(--bg-hover);
  }
  .card.working {
    border-left: 4px solid var(--accent);
    border-color: var(--accent);
    background: var(--bg-hover-active);
  }
  .card.working .card-name {
    color: var(--text);
    font-weight: 600;
  }
  .card.selected.working {
    border-color: var(--accent);
    background: var(--bg-hover-selected);
  }
  .card-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .card-name {
    font-weight: 500;
    font-size: 14px;
    min-width: 0;
  }
  .card-due {
    font-size: 11px;
    color: var(--accent);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .empty {
    text-align: center;
    color: var(--text-empty);
    font-size: 12px;
    padding: 20px 0;
  }

  /* --- add btn --- */
  .add-btn {
    margin: 8px;
    padding: 8px;
    border: 1px dashed var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-dim);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .add-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  /* --- footer --- */
  .footer {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 16px;
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: #666;
    flex-shrink: 0;
  }
  .footer kbd {
    font-size: 10px;
    margin-right: 3px;
  }
  .footer span + span::before {
    content: "·";
    margin-right: 14px;
    color: #444;
  }

  /* --- overlay / dialog --- */
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
    min-width: 400px;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .dialog h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .edit-dialog {
    min-width: 600px;
    max-width: 640px;
    min-height: 500px;
    max-height: 85vh;
  }
  .edit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .edit-preview {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-height: 80px;
  }

  .edit-dialog .dialog-actions {
    margin-top: auto;
  }

  .dialog-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .btn .shortcut-hint {
    font-size: 11px;
    margin-left: 6px;
    color: var(--text-dim);
  }
  .btn.primary .shortcut-hint {
    color: rgba(0, 0, 0, 0.45);
  }

  /* --- help --- */
  .help-dialog {
    min-width: 360px;
  }
  .help-dialog table {
    width: 100%;
    border-collapse: collapse;
  }
  .help-dialog td {
    padding: 6px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
  }
  .help-dialog td:first-child {
    white-space: nowrap;
    padding-right: 20px;
  }
  .help-dialog kbd {
    font-size: 11px;
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 1px 5px;
  }

  /* --- archive button in header --- */
  .archive-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    font: inherit;
    font-size: 11px;
    padding: 2px 8px;
    cursor: pointer;
    margin-left: 6px;
  }
  .archive-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }
</style>
