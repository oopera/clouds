<script lang="ts">
  import { cubicBezier } from '$lib/shaders/utils/tween';
  import { onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  export let delay: number = 0;
  export let secondary = false;
  export let tertiary = false;
  export let accent = false;
  export let nowrap = false;
  export let text = '';
  export let type: 'p' | 'h1' = 'p';
  export let end = false;

  let wordArray = text?.split(' ');

  let mounted = false;

  $: {
    wordArray = text?.split(' ');
  }

  onMount(() => {
    setTimeout(() => {
      mounted = true;
    }, 1);
  });
</script>

{#if type === 'p'}
  <p
    class:nowrap
    class:secondary
    class:tertiary
    class:accent
    class:end
    out:fly={{
      delay: delay * 25,
      duration: 150,
      y: 15,
      easing: cubicBezier,
    }}
  >
    {#each wordArray as word, i}
      <span class="outer">
        {#each word.split('') as letter, j}
          <span class="inner" class:mounted style={`--i: ${j + i + delay}`}>
            {letter}
          </span>
        {/each}
      </span>
      {#if i !== wordArray.length - 1}
        {` `}
      {/if}
    {/each}
  </p>
{:else if type === 'h1'}
  <h1
    class:nowrap
    class:secondary
    class:tertiary
    class:accent
    out:fly={{
      delay: delay * 25,
      duration: 150,
      y: 15,
      easing: cubicBezier,
    }}
  >
    {#each wordArray as word, i}
      <span class="outer">
        {#each word.split('') as letter, j}
          <span class="inner" class:mounted style={`--i: ${j + i + delay}`}>
            {letter}
          </span>
        {/each}
      </span>
      {#if i !== wordArray.length - 1}
        {` `}
      {/if}
    {/each}
  </h1>
{/if}

<style lang="scss">
  span {
    display: inline-block;
    position: relative;
    vertical-align: top;
    padding: 0;
    margin: 0;
  }
  .end {
    text-align: end;
  }

  .outer {
    overflow: hidden;
    display: inline-block;
    white-space: nowrap;
    padding-bottom: 0.2rem;
  }
  h1 .inner {
    line-height: 1em;
    transform: translateY(-125%);
    transition: transform 500ms var(--ease) calc(var(--i) * 65ms);
  }
  p .inner {
    line-height: 1em;
    transform: translateY(125%);
    transition: transform 500ms var(--ease) calc(var(--i) * 65ms);
  }
  p .mounted {
    transition: transform 500ms var(--ease) calc(var(--i) * 25ms);
    transform: translateY(0%);
  }
  h1 .mounted {
    transition: transform 500ms var(--ease) calc(var(--i) * 75ms);
    transform: translateY(0%);
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

  .nowrap {
    white-space: nowrap;
  }
</style>
