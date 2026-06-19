<script lang="ts">
  import { fade, scale } from "svelte/transition";

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
<div
  class="overlay"
  onclick={onclose}
  role="dialog"
  tabindex="-1"
  transition:fade={{ duration: 120 }}
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="dialog {dialogClass}"
    onclick={(e) => e.stopPropagation()}
    role="presentation"
    transition:scale={{ duration: 140, start: 0.97 }}
  >
    {@render children()}
  </div>
</div>
