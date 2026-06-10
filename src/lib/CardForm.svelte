<script lang="ts">
  let {
    name = $bindable(""),
    content = $bindable(""),
    tags = $bindable(""),
    dueDate = $bindable(""),
    editMode = false,
  }: {
    name?: string;
    content?: string;
    tags?: string;
    dueDate?: string;
    editMode?: boolean;
  } = $props();
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
  <input type="text" bind:value={tags} placeholder="comma, separated" />
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
</style>
