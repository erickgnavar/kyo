<script lang="ts">
  import CardForm from "$lib/CardForm.svelte";
  import CardListOverlay from "$lib/CardListOverlay.svelte";
  import CardModal from "$lib/CardModal.svelte";
  import CommandPalette from "$lib/CommandPalette.svelte";
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

  let cards = $state(store.cards);

  let grouped: Record<string, Card[]> = $derived({
    backlog: cards
      .filter((c) => c.column === "backlog" && !c.archived && !c.done)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    today: cards.filter((c) => c.column === "today" && !c.archived && !c.done),
    upcoming: cards
      .filter((c) => c.column === "backlog" && c.dueDate && !c.archived && !c.done)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
  });
  let archivedCards = $derived(cards.filter((c) => c.archived && !c.done));
  let doneCards = $derived(cards.filter((c) => c.done));
  let allTags = $derived([...new Set(cards.flatMap((c) => c.tags ?? []))].sort());

  // keep local snapshot in sync with store + initial load from backend
  $effect(() => {
    const unsub = store.onUpdate(() => {
      cards = store.cards;
    });
    store.init().then(() => {
      cards = store.cards;
    });
    return unsub;
  });

  // --- UI state ---
  let colIdx = $state(1);
  let rowIdx = $state(0);
  let showCardModal = $state(false);
  let viewingCardId = $state<string | null>(null);
  let showHelp = $state(false);
  let showNewDialog = $state(false);
  let showEditDialog = $state(false);
  let showArchived = $state(false);
  let showDone = $state(false);
  let showCommandPalette = $state(false);
  let editPreview = $state(false);

  // form fields (shared between new & edit via CardForm bindings)
  let formName = $state("");
  let formContent = $state("");
  let formTags = $state("");
  let formDueDate = $state("");

  // edit-specific
  let editId = $state<string | null>(null);

  // --- derived ---
  let visibleCards = $derived(grouped[COLUMNS[colIdx].id] ?? []);

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

  function submitEdit() {
    if (!editId || !formName.trim()) return;
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    store.update(editId, {
      name: formName.trim(),
      content: formContent.trim(),
      tags,
      dueDate: formDueDate || "",
    });
    showEditDialog = false;
    editId = null;
  }

  function submitNewCard() {
    const name = formName.trim();
    if (!name) return;
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    store.add("backlog", name, formContent.trim(), tags, formDueDate || undefined);
    showNewDialog = false;
    colIdx = COLUMNS.findIndex((c) => c.id === "backlog");
    rowIdx = store.getByColumn("backlog").length - 1;
  }

  function onKey(e: KeyboardEvent) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (
      showNewDialog ||
      showEditDialog ||
      showHelp ||
      showArchived ||
      showCardModal ||
      showDone ||
      showCommandPalette
    ) {
      if (key === "Escape" || key === "escape") {
        showNewDialog = false;
        showEditDialog = false;
        showHelp = false;
        showArchived = false;
        showCardModal = false;
        showDone = false;
        showCommandPalette = false;
        viewingCardId = null;
      }
      if (showNewDialog && (key === "Enter" || key === "enter") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitNewCard();
      }
      if (showEditDialog && (key === "Enter" || key === "enter") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitEdit();
      }
      if (showEditDialog && (key === "p" || key === "P") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        editPreview = !editPreview;
      }
      if (showCardModal && key === "e") {
        e.preventDefault();
        const card = cards.find((c) => c.id === viewingCardId);
        if (card) {
          showCardModal = false;
          openEditFor(card);
        }
      }
      if (showCardModal && key === "x") {
        e.preventDefault();
        const card = cards.find((c) => c.id === viewingCardId);
        if (card) {
          store.markDone(card.id);
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
            store.moveWithinColumn(visibleCards[rowIdx].id, 1);
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
            store.moveWithinColumn(visibleCards[rowIdx].id, -1);
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
        if (visibleCards[rowIdx]) store.moveToColumn(visibleCards[rowIdx].id, "today");
        break;
      case "b":
        e.preventDefault();
        if (visibleCards[rowIdx]) store.moveToColumn(visibleCards[rowIdx].id, "backlog");
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
        if (visibleCards[rowIdx]) store.archive(visibleCards[rowIdx].id);
        break;
      case "x":
        e.preventDefault();
        if (visibleCards[rowIdx]) store.markDone(visibleCards[rowIdx].id);
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
          <span class="count">{grouped[col.id].length}</span>
        </div>
        <div class="card-list">
          {#each grouped[col.id] as card, ri (card.id)}
            <button
              class="card"
              class:working={col.id === "today" && ri === 0}
              class:selected={ci === colIdx && ri === rowIdx}
              onclick={() => { colIdx = ci; rowIdx = ri; viewingCardId = card.id; showCardModal = true; }}
            >
              <div class="card-name">{card.name}</div>
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
  <div
    class="overlay"
    onclick={() => (showNewDialog = false)}
    onkeydown={(e) => e.key === "Escape" && (showNewDialog = false)}
    role="dialog"
    tabindex="-1"
  >
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
  <div
    class="overlay"
    onclick={() => (showEditDialog = false)}
    onkeydown={(e) => e.key === "Escape" && (showEditDialog = false)}
    role="dialog"
    tabindex="-1"
  >
    <div class="dialog edit-dialog" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="edit-header">
        <h3>Edit Card</h3>
        <button type="button" class="btn small" onclick={() => (editPreview = !editPreview)}>
          {editPreview ? "Edit" : "Preview"}
          <span class="shortcut-hint">{navigator.platform.includes("Mac") ? "⌘P" : "Ctrl+P"}</span>
        </button>
      </div>

      {#if editPreview}
        <div class="edit-preview markdown">
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
      onclose={() => { showCardModal = false; viewingCardId = null; }}
      onedit={() => { showCardModal = false; openEditFor(card); }}
      ondone={() => { store.markDone(card.id); showCardModal = false; viewingCardId = null; }}
    />
  {/if}
{/if}

{#if showCommandPalette}
  <CommandPalette
    {cards}
    columnTitles={{ backlog: "Backlog", today: "Today", upcoming: "Upcoming" }}
    onclose={() => (showCommandPalette = false)}
    onEndOfDay={() => store.endOfDay()}
    onCardSelect={(id) => { viewingCardId = id; showCardModal = true; }}
  />
{/if}

<!-- help -->
{#if showHelp}
  <div
    class="overlay"
    onclick={() => (showHelp = false)}
    onkeydown={(e) => e.key === "Escape" && (showHelp = false)}
    role="dialog"
    tabindex="-1"
  >
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
    restore={(c) => store.restore(c.id, "backlog")}
    label="Restore to Backlog"
    secondaryRestore={(c) => store.restore(c.id, "today")}
    secondaryLabel="Restore to Today"
  />
{/if}

<!-- done overlay -->
{#if showDone}
  <CardListOverlay
    title="Done Cards ({doneCards.length})"
    cards={doneCards}
    onclose={() => (showDone = false)}
    restore={(c) => store.unmarkDone(c.id)}
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
    color: #e0e0e0;
    background: #1a1a2e;
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
    background: #16213e;
    border-bottom: 1px solid #0f3460;
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
    color: #e94560;
  }
  .shortcut-hint {
    font-size: 12px;
    color: #888;
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
    background: #16213e;
    border-radius: 8px;
    border: 1px solid #0f3460;
    overflow: hidden;
    opacity: 0.45;
    transition: opacity 0.1s;
  }
  .column.active {
    border-color: #e94560;
    opacity: 1;
  }
  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #1a1a2e;
    border-bottom: 1px solid #0f3460;
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
    background: #0f3460;
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
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 6px;
    padding: 10px 12px;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }
  .card:hover {
    background: #1e2a4a;
  }
  .card.selected {
    border-color: #e94560;
    background: #1e2a4a;
  }
  .card.working {
    border-left: 4px solid #e94560;
    border-color: #e94560;
    background: #263050;
  }
  .card.working .card-name {
    color: #fff;
    font-weight: 600;
  }
  .card.selected.working {
    border-color: #e94560;
    background: #2d3858;
  }
  .card-name {
    font-weight: 500;
    font-size: 14px;
  }
  .empty {
    text-align: center;
    color: #555;
    font-size: 12px;
    padding: 20px 0;
  }

  /* --- add btn --- */
  .add-btn {
    margin: 8px;
    padding: 8px;
    border: 1px dashed #0f3460;
    border-radius: 6px;
    background: transparent;
    color: #888;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .add-btn:hover {
    border-color: #e94560;
    color: #e0e0e0;
  }

  /* --- footer --- */
  .footer {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 16px;
    background: #16213e;
    border-top: 1px solid #0f3460;
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
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 6px;
    min-height: 80px;
  }
  :global(.edit-preview.markdown h1),
  :global(.edit-preview.markdown h2),
  :global(.edit-preview.markdown h3) {
    margin: 16px 0 8px;
    color: #e0e0e0;
  }
  :global(.edit-preview.markdown h1) {
    font-size: 18px;
  }
  :global(.edit-preview.markdown h2) {
    font-size: 16px;
  }
  :global(.edit-preview.markdown h3) {
    font-size: 14px;
  }
  :global(.edit-preview.markdown p) {
    margin: 0 0 8px;
    color: #ccc;
  }
  :global(.edit-preview.markdown ul),
  :global(.edit-preview.markdown ol) {
    margin: 0 0 8px;
    padding-left: 20px;
    color: #ccc;
  }
  :global(.edit-preview.markdown li) {
    margin-bottom: 2px;
  }
  :global(.edit-preview.markdown code) {
    font-size: 12px;
    background: #0f3460;
    border-radius: 3px;
    padding: 1px 4px;
    color: #e0e0e0;
  }
  :global(.edit-preview.markdown pre) {
    background: #0a0a1a;
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    margin: 8px 0;
  }
  :global(.edit-preview.markdown pre code) {
    background: none;
    padding: 0;
  }
  :global(.edit-preview.markdown a) {
    color: #66b3ff;
    text-decoration: underline;
  }
  :global(.edit-preview.markdown a:hover) {
    color: #99ccff;
  }
  :global(.edit-preview.markdown blockquote) {
    border-left: 3px solid #0f3460;
    margin: 8px 0;
    padding: 4px 12px;
    color: #aaa;
  }
  :global(.edit-preview.markdown strong) {
    color: #e0e0e0;
  }
  :global(.edit-preview.markdown table) {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 13px;
  }
  :global(.edit-preview.markdown th),
  :global(.edit-preview.markdown td) {
    border: 1px solid #0f3460;
    padding: 6px 10px;
    text-align: left;
  }
  :global(.edit-preview.markdown th) {
    background: #1a1a2e;
    color: #e0e0e0;
    font-weight: 600;
  }
  :global(.edit-preview.markdown td) {
    color: #ccc;
  }
  :global(.edit-preview.markdown tr:nth-child(even)) {
    background: rgba(255, 255, 255, 0.02);
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

  .btn .shortcut-hint {
    font-size: 11px;
    margin-left: 6px;
    color: #e6b3b3;
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
    border-bottom: 1px solid #0f3460;
  }
  .help-dialog td:first-child {
    white-space: nowrap;
    padding-right: 20px;
  }
  .help-dialog kbd {
    font-size: 11px;
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 3px;
    padding: 1px 5px;
  }

  /* --- archive button in header --- */
  .archive-btn {
    background: transparent;
    border: 1px solid #0f3460;
    border-radius: 4px;
    color: #888;
    font: inherit;
    font-size: 11px;
    padding: 2px 8px;
    cursor: pointer;
    margin-left: 6px;
  }
  .archive-btn:hover {
    border-color: #e94560;
    color: #e0e0e0;
  }
</style>
