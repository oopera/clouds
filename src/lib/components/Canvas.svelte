<script lang="ts">
  import { onMount } from 'svelte';
  import InitializeScene from '$lib/shaders/initializeScene';

  let hasInitialized = false;
  onMount(() => {
    if (hasInitialized) return;
    hasInitialized = true;
    InitializeScene();
  });
</script>

<canvas id="canvas" />

<style lang="scss">
  canvas {
    position: fixed;
    left: 0;
    top: 0;
    width: calc(100vw);
    height: calc(100vh);
    opacity: 1;
  }

  svg {
    height: 50vh;
    aspect-ratio: 1 / 1;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: -1;
  }
</style>
