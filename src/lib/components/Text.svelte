<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicBezier } from '$lib/stores/easing';

  export let delay: number = 0;
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

<p class:mini class:nowrap class:secondary class:tertiary class:accent>
  {#each splitText as letter, i}
    {#if mounted}
      <span
        in:fly={{
          delay: delay * 125 + i * 25,
          duration: 350,
          x: vertical ? -15 : 0,
          y: !vertical ? -15 : 0,
          easing: cubicBezier,
        }}
        out:fly={{
          delay: 1 * 125 + i * 25,
          duration: 350,
          x: vertical ? 15 : 0,
          y: !vertical ? 15 : 0,
          easing: cubicBezier,
        }}
      >
        {letter === ' ' ? '\u00A0' : letter}
      </span>
    {/if}
  {/each}
</p>

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
    transition: color 128ms var(--ease);
    will-change: color;
  }
  .nowrap {
    white-space: nowrap;
  }
</style>
