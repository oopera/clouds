<script lang="ts">
  import { onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  export let delay: number = 0;
  export let type: 'p' | 'h1' = 'p';
  export let secondary = false;
  export let tertiary = false;
  export let vertical = false;
  export let text = '';

  let splitText = text?.split('');

  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  $: {
    splitText = text?.split('');
  }
</script>

{#if mounted && vertical}
  <p>
    {#each splitText as letter, i}
      <span
        class:secondary
        class:tertiary
        in:fly={{
          delay: delay * 125 + i * 25,
          duration: 350,
          x: -15,
          easing: quintOut,
        }}
        out:fly={{
          delay: 1 * 125 + i * 25,
          duration: 350,
          x: 15,
          easing: quintOut,
        }}
      >
        {letter === ' ' ? '\u00A0' : letter}
      </span>
    {/each}
  </p>
{/if}

{#if mounted && type === 'p' && !vertical}
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

{#if mounted && type === 'h1' && !vertical}
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
  span {
    display: inline-block;
    position: relative;
  }
  .secondary {
    color: var(--c-secondary);
  }
  .tertiary {
    color: var(--c-tertiary);
  }
</style>
