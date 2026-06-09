<script lang="ts">
  let { onclose, onEndOfDay }: { onclose: () => void; onEndOfDay: () => void } = $props();

  let query = $state("");
  let selected = $state(0);

  const actions = [
    {
      id: "end-of-day",
      label: "End of Day",
      description: "Move all non-done cards from Today to Backlog and increment their score",
      run: () => onEndOfDay(),
    },
  ];

  let filtered = $derived(
    actions.filter(
      (a) =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase()),
    ),
  );

  function onKey(e: KeyboardEvent) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === "Escape" || key === "escape") {
      e.preventDefault();
      onclose();
      return;
    }

    if (key === "ArrowDown" || key === "arrowdown") {
      e.preventDefault();
      selected = Math.min(selected + 1, filtered.length - 1);
      return;
    }

    if (key === "ArrowUp" || key === "arrowup") {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
      return;
    }

    if (key === "Enter" || key === "enter") {
      e.preventDefault();
      const action = filtered[selected];
      if (action) {
        action.run();
        onclose();
      }
      return;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="overlay" onclick={onclose}>
  <div class="palette" onclick={(e) => e.stopPropagation()}>
    <input
      type="text"
      class="search"
      placeholder="Type a command..."
      bind:value={query}
      autofocus
    />

    <div class="list">
      {#each filtered as action, i}
        <button
          class="item"
          class:selected={i === selected}
          onclick={() => { action.run(); onclose(); }}
        >
          <span class="label">{action.label}</span>
          <span class="desc">{action.description}</span>
        </button>
      {:else}
        <div class="empty">No matching commands</div>
      {/each}
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
