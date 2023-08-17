<script lang="ts">
  import { onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  export let delay: number = 0;
  export let type: 'p' | 'h1' = 'p';
  export let secondary = false;
  export let tertiary = false;
  export let accent = false;
  export let vertical = false;
  export let nowrap = false;
  export let text = '';
  export let mini: boolean = false;

  let splitText = text?.split('');

  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  $: {
    splitText = text?.split('');
  }
</script>

{#if mounted}
  {#if type === 'p'}
    <p class:mini class:nowrap>
      {#each splitText as letter, i}
        <span
          class:secondary
          class:tertiary
          class:accent
          in:fly={{
            delay: delay * 125 + i * 25,
            duration: 350,
            x: vertical ? -15 : 0,
            y: !vertical ? -15 : 0,
            easing: quintOut,
          }}
          out:fly={{
            delay: 1 * 125 + i * 25,
            duration: 350,
            x: vertical ? 15 : 0,
            y: !vertical ? 15 : 0,
            easing: quintOut,
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      {/each}
    </p>
  {/if}

  {#if type === 'h1'}
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
  .accent {
    color: var(--c-accent);
  }
  .mini {
    max-width: 16px;
  }
  span {
    transition: color 128ms ease-in-out;
    will-change: color;
  }
  .nowrap {
    white-space: nowrap;
  }
</style>
