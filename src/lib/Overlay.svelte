<script lang="ts">
  let {
    onclose,
    class: dialogClass = "",
    children,
  }: {
    onclose: () => void;
    class?: string;
    children: import("svelte").Snippet;
  } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" onclick={onclose} role="dialog" tabindex="-1">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="dialog {dialogClass}" onclick={(e) => e.stopPropagation()} role="presentation">
    {@render children()}
  </div>
</div>
