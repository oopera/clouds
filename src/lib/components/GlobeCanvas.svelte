<script lang="ts">
  import { onMount } from 'svelte';
  import InitializeScene from '$lib/shaders/initializeScene';

  onMount(() => {
    InitializeScene();
  });
</script>

<canvas class="canvas" id="canvas" />

<style>
  .canvas {
    position: fixed;
    left: 0;
    top: 0;
    width: calc(100vw);
    height: calc(100vh);
    opacity: 1;
  }
</style>
