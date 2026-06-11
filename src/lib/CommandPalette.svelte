<script lang="ts">
  import type { Card } from "$lib/types.ts";

  let {
    cards = [],
    columnTitles = {},
    onclose,
    onEndOfDay,
    onCardSelect,
    onViewArchived,
    onViewDone,
    onWeeklyReview,
  }: {
    cards?: Card[];
    columnTitles?: Record<string, string>;
    onclose: () => void;
    onEndOfDay: () => void;
    onCardSelect?: (id: string) => void;
    onViewArchived?: () => void;
    onViewDone?: () => void;
    onWeeklyReview?: () => void;
  } = $props();

  let query = $state("");
  let selected = $state(0);
  let mode = $state<"commands" | "search">("commands");
  let inputEl: HTMLInputElement | undefined = $state();

  // Focus on mount
  $effect(() => {
    if (inputEl) inputEl.focus();
  });

  // Re-focus when switching to search mode
  $effect(() => {
    if (mode === "search" && inputEl) inputEl.focus();
  });

  const actions = [
    {
      id: "search-cards",
      label: "Search Cards",
      description: "Find a card by name",
      run: () => {
        mode = "search";
        query = "";
        selected = 0;
      },
    },
    {
      id: "end-of-day",
      label: "End of Day",
      description: "Move all non-done cards from Today to Backlog and increment their score",
      run: () => onEndOfDay(),
    },
    {
      id: "view-archived",
      label: "View Archived",
      description: "Open archived cards",
      run: () => {
        onViewArchived?.();
        onclose();
      },
    },
    {
      id: "view-done",
      label: "View Done",
      description: "Open done cards",
      run: () => {
        onViewDone?.();
        onclose();
      },
    },
    {
      id: "weekly-review",
      label: "Weekly Review",
      description: "Show cards completed this week",
      run: () => {
        onWeeklyReview?.();
        onclose();
      },
    },
  ];

  let cardResults = $derived(
    mode === "search" && query.trim()
      ? cards.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
      : [],
  );

  function cardDesc(c: Card) {
    if (c.doneAt) return "Done";
    if (c.archived) return "Archived";
    return columnTitles[c.column] ?? c.column;
  }

  let filtered = $derived(
    mode === "commands"
      ? actions.filter(
          (a) =>
            a.label.toLowerCase().includes(query.toLowerCase()) ||
            a.description.toLowerCase().includes(query.toLowerCase()),
        )
      : [],
  );

  let items = $derived(mode === "commands" ? filtered : cardResults);

  function onKey(e: KeyboardEvent) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === "Escape" || key === "escape") {
      e.preventDefault();
      if (mode === "search") {
        mode = "commands";
        query = "";
        selected = 0;
      } else {
        onclose();
      }
      return;
    }

    if (key === "ArrowDown" || key === "arrowdown" || (key === "n" && e.ctrlKey)) {
      e.preventDefault();
      selected = Math.min(selected + 1, items.length - 1);
      return;
    }

    if (key === "ArrowUp" || key === "arrowup" || (key === "p" && e.ctrlKey)) {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
      return;
    }

    if (key === "Enter" || key === "enter") {
      e.preventDefault();
      const action = filtered[selected];
      if (mode === "commands" && action) {
        action.run();
        if (action.id !== "search-cards") onclose();
      } else if (mode === "search" && onCardSelect) {
        const card = cardResults[selected];
        if (card) {
          onCardSelect(card.id);
          onclose();
        }
      }
      return;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="overlay"
  onclick={onclose}
  onkeydown={(e) => e.key === "Escape" && onclose()}
  role="dialog"
  tabindex="-1"
>
  <div class="palette" onclick={(e) => e.stopPropagation()} role="presentation">
    <input
      type="text"
      class="search"
      placeholder={mode === "commands" ? "Type a command..." : "Search cards by name..."}
      bind:value={query}
      bind:this={inputEl}
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      oninput={() => { selected = 0; }}
    />

    <div class="list">
      {#if mode === "commands"}
        {#each filtered as action, i}
          <button
            class="item"
            class:selected={i === selected}
            onclick={() => {
              selected = i;
              action.run();
              if (action.id !== "search-cards") onclose();
            }}
          >
            <span class="label">{action.label}</span>
            <span class="desc">{action.description}</span>
          </button>
        {:else}
          <div class="empty">No matching commands</div>
        {/each}
      {:else}
        {#each cardResults as card, i}
          <button
            class="item row"
            class:selected={i === selected}
            onclick={() => {
              selected = i;
              onCardSelect?.(card.id);
              onclose();
            }}
          >
            <span class="label">{card.name}</span>
            <span class="desc">{cardDesc(card)}</span>
          </button>
        {:else}
          <div class="empty">
            {query.trim() ? "No matching cards" : "Start typing a card name..."}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    z-index: 200;
  }

  .palette {
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 10px;
    width: 480px;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .search {
    background: #1a1a2e;
    border: none;
    border-bottom: 1px solid #0f3460;
    padding: 14px 16px;
    color: #e0e0e0;
    font: inherit;
    font-size: 15px;
    outline: none;
  }

  .search::placeholder {
    color: #555;
  }

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .item.selected {
    background: #1e2a4a;
  }

  .item:hover {
    background: #1e2a4a;
  }

  .item.row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .item.row .desc {
    flex-shrink: 0;
    margin-left: 12px;
  }

  .label {
    font-size: 14px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .desc {
    font-size: 11px;
    color: #888;
  }

  .empty {
    text-align: center;
    color: #555;
    font-size: 13px;
    padding: 20px 0;
  }
</style>
