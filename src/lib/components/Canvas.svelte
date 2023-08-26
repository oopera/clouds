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

<style>
  canvas {
    position: fixed;
    left: 0;
    top: 0;
    width: calc(100vw);
    height: calc(100vh);
    opacity: 1;
  }
</style>
