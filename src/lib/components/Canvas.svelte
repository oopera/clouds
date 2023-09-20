<script lang="ts">
  import InitializeScene from '$lib/shaders/initializeScene';
  import { onMount } from 'svelte';

  onMount(() => {
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
    z-index: 0;
  }
</style>
