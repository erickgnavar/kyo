<script lang="ts">
  let {
    name = $bindable(""),
    content = $bindable(""),
    tags = $bindable(""),
    dueDate = $bindable(""),
    editMode = false,
    suggestions = [],
  }: {
    name?: string;
    content?: string;
    tags?: string;
    dueDate?: string;
    editMode?: boolean;
    suggestions?: string[];
  } = $props();

  let showSuggestions = $state(false);
  let selectedSuggestion = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();

  let currentToken = $derived.by(() => {
    const parts = tags.split(",");
    return parts[parts.length - 1].trim().toLowerCase();
  });

  let matches = $derived(
    currentToken.length > 0
      ? suggestions
          .filter(
            (s) =>
              s.toLowerCase().includes(currentToken) &&
              !tags
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .includes(s.toLowerCase()),
          )
          .slice(0, 8)
      : [],
  );

  function onInputKeydown(e: KeyboardEvent) {
    if (matches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedSuggestion = Math.min(selectedSuggestion + 1, matches.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedSuggestion = Math.max(selectedSuggestion - 1, 0);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (showSuggestions && matches[selectedSuggestion]) {
        e.preventDefault();
        acceptSuggestion(matches[selectedSuggestion]);
      }
    } else if (e.key === "Escape") {
      showSuggestions = false;
    }
  }

  function onInputInput() {
    selectedSuggestion = 0;
    showSuggestions = matches.length > 0;
  }

  function acceptSuggestion(suggestion: string) {
    const parts = tags.split(",");
    parts[parts.length - 1] = suggestion;
    tags = parts.join(", ").replace(/,(\s*)$/, "$1") + ", ";
    showSuggestions = false;
    inputEl?.focus();
  }
</script>

<label>
  Name *
  <input type="text" bind:value={name} placeholder="card name" autofocus />
</label>

<label class:grow={editMode}>
  Content
  <textarea
    bind:value={content}
    placeholder="description (optional)"
    rows={editMode ? 10 : 3}
  ></textarea>
</label>

<label>
  Tags
  <div class="tag-input-wrapper">
    <input
      type="text"
      bind:value={tags}
      bind:this={inputEl}
      placeholder="comma, separated"
      onkeydown={onInputKeydown}
      oninput={onInputInput}
      onblur={() => setTimeout(() => (showSuggestions = false), 150)}
    />
    {#if showSuggestions && matches.length > 0}
      <div class="suggestions">
        {#each matches as suggestion, i}
          <button
            type="button"
            class="suggestion"
            class:selected={i === selectedSuggestion}
            onmousedown={(e) => { e.preventDefault(); acceptSuggestion(suggestion); }}
          >
            {suggestion}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</label>

<label>
  Due date
  <input type="date" bind:value={dueDate} />
</label>

<style>
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #aaa;
  }

  label.grow {
    flex: 1;
    min-height: 0;
  }

  label.grow textarea {
    flex: 1;
    min-height: 80px;
  }

  input[type="text"],
  textarea,
  input[type="date"] {
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 6px;
    padding: 8px 10px;
    color: #e0e0e0;
    font: inherit;
    font-size: 13px;
    outline: none;
  }

  input:focus,
  textarea:focus {
    border-color: #e94560;
  }

  textarea {
    resize: vertical;
  }

  .tag-input-wrapper {
    position: relative;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 2px;
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 6px;
    overflow: hidden;
    z-index: 50;
  }

  .suggestion {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    border: none;
    background: transparent;
    color: #ccc;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .suggestion.selected,
  .suggestion:hover {
    background: #1e2a4a;
    color: #fff;
  }
</style>
