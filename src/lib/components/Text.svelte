<script lang="ts">
  import { onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  export let delay: number = 0;
  export let type: 'p' | 'h1' = 'p';
  export let secondary = false;
  export let tertiary = false;

  let mounted = false;

  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted && type === 'p'}
  <p
    class:secondary
    in:fly={{
      delay: delay * 125,
      duration: 350,
      y: -15,
      easing: quintOut,
    }}
    out:fly={{
      delay: 1 * 125,
      duration: 350,
      y: 15,
      easing: quintOut,
    }}
  >
    <slot />
  </p>
{/if}

{#if mounted && type === 'h1'}
  <h1
    in:fly={{
      delay: delay * 125,
      duration: 350,
      y: 15,
      easing: quintOut,
    }}
  >
    <slot />
  </h1>
{/if}

<style lang="scss">
  .secondary {
    color: var(--c-secondary);
  }
  .tertiary {
    color: var(--c-tertiary);
  }
</style>
