<script lang="ts">
  import type { Card } from "$lib/types.ts";

  let {
    cards = [],
    onclose,
    onEndOfDay,
    onCardSelect,
  }: {
    cards?: Card[];
    onclose: () => void;
    onEndOfDay: () => void;
    onCardSelect?: (id: string) => void;
  } = $props();

  let query = $state("");
  let selected = $state(0);
  let mode = $state<"commands" | "search">("commands");
  let inputEl: HTMLInputElement | undefined = $state();

  // Focus when component mounts or mode changes
  $effect(() => {
    // track both inputEl and mode
    void inputEl;
    void mode;
    setTimeout(() => inputEl?.focus(), 50);
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
  ];

  let cardResults = $derived(
    mode === "search" && query.trim()
      ? cards
          .filter(
            (c) => !c.archived && !c.done && c.name.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 20)
      : [],
  );

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
  let placeholder = $derived(mode === "commands" ? "Type a command..." : "Search cards by name...");

  function selectCurrent() {
    const item = items[selected];
    if (!item) return;

    if (mode === "commands") {
      const action = item as (typeof actions)[0];
      action.run();
      if (action.id !== "search-cards") onclose();
    } else if (mode === "search" && onCardSelect) {
      const card = item as Card;
      onCardSelect(card.id);
      onclose();
    }
  }

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

    if (key === "ArrowDown" || key === "arrowdown") {
      e.preventDefault();
      selected = Math.min(selected + 1, items.length - 1);
      return;
    }

    if (key === "ArrowUp" || key === "arrowup") {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
      return;
    }

    if (key === "Enter" || key === "enter") {
      e.preventDefault();
      selectCurrent();
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
      {placeholder}
      bind:value={query}
      bind:this={inputEl}
      oninput={() => { selected = 0; }}
    />

    <div class="list">
      {#each items as item, i}
        <button
          class="item"
          class:selected={i === selected}
          onclick={() => {
            selected = i;
            selectCurrent();
          }}
        >
          {#if mode === "commands"}
            <span class="label">{(item as (typeof actions)[0]).label}</span>
            <span class="desc">{(item as (typeof actions)[0]).description}</span>
          {:else}
            <span class="label">{(item as Card).name}</span>
            <span class="desc"
              >{COLUMNS.find((c) => c.id === (item as Card).column)?.title ?? (item as Card).column}</span
            >
          {/if}
        </button>
      {:else}
        <div class="empty">
          {mode === "commands" ? "No matching commands" : query.trim() ? "No matching cards" : "Start typing a card name..."}
        </div>
      {/each}
    </div>
  </div>
</div>

<script lang="ts" context="module">
  const COLUMNS: { id: string; title: string }[] = [
    { id: "backlog", title: "Backlog" },
    { id: "today", title: "Today" },
    { id: "upcoming", title: "Upcoming" },
  ];
</script>

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
