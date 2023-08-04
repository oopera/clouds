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
    z-index: 1;

    position: fixed;
    left: 0;
    left: 50%;
    top: 50%;
    width: 100%;
    transform: translate(-50%, -50%);
    height: calc(100vh);
    aspect-ratio: 1/1;
    opacity: 1;
    transition: 350ms width cubic-bezier(0.25, 0.46, 0.45, 0.94),
      350ms border-radius ease;
  }
</style>
