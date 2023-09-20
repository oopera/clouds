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
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 1;
  }
</style>
