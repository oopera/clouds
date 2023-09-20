<script lang="ts">
  import { onMount } from 'svelte';

  let x = 0;
  let y = 0;
  let interactable = false;
  let controls = false;

  onMount(() => {
    window.onmousemove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;

      controls = (e.target as HTMLElement).closest('[data-hud]') !== null;
      interactable =
        (e.target as HTMLElement).closest('[data-interactable]') !== null;
    };
  });
</script>

<div
  class="cursor"
  class:interactable
  class:controls
  style="transform: translate({x - 5}px, {y - 5}px"
>
  <div class="crosshair-edge" />
</div>

<style lang="scss">
  .cursor {
    pointer-events: none;
    z-index: 100;
    width: 24px;
    height: 24px;
    position: fixed;
    mix-blend-mode: difference;
  }

  .crosshair-edge {
    position: absolute;
    width: 14px;
    height: 14px;
    transition: 150ms var(--ease);
    border: 1pt solid white;
    border-radius: 14px;
    left: -2px;
    top: -2px;
  }

  .interactable {
    .crosshair-edge {
      width: 24px;
      height: 24px;
    }
  }
</style>
