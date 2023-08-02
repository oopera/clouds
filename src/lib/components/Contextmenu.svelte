<script lang="ts">
  import { onMount } from 'svelte';

  import Text from './Text.svelte';

  let opened = false;
  let mouseCoords = { x: 0, y: 0 };

  function handleContextmenu(e) {
    if (opened) {
      return true;
    }
    e.preventDefault();
    opened = !opened;
    console.log(opened);
    mouseCoords = { x: e.clientX, y: e.clientY };
    return false;
  }

  onMount(() => {
    window.addEventListener('contextmenu', handleContextmenu);
    window.addEventListener('click', () => {
      opened = false;
    });
    return () => {
      window.removeEventListener('contextmenu', handleContextmenu);
      window.removeEventListener('click', () => {
        opened = false;
      });
    };
  });
</script>

<div
  class="contextmenu opened"
  style="transform: translate({mouseCoords.x}px, {mouseCoords.y}px)"
  class:opened
>
  <div class="contextmenu-inner">
    <Text>Contextmenu</Text>
    <br />
    <Text>Contextmenu</Text>

    <Text>Contextmenu</Text>
  </div>
</div>

<style lang="scss">
  .contextmenu {
    position: absolute;
    border: 1pt solid var(--c-g);
    border-radius: 16px;
    padding: 8px;
    display: flex;
    opacity: 0;
    z-index: 10;
    backdrop-filter: blur(24px);
  }
  .opened {
    opacity: 1;
  }
</style>
