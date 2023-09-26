<script lang="ts">
  import { onMount } from 'svelte';
  import type { Stores } from '$lib/types/types';
  import Layout from './Layout.svelte';

  export let title: Stores;

  export let step: number = 1;
  export let min: number = 0;
  export let max: number = 100;
  export let disabled: boolean = false;
  export let delay: number = 1;
  let steps: number = (max - min) / step;
  let text: Stores = title;
  let store: any;
  let mounted: boolean = false;

  onMount(async () => {
    store = await import(`../stores/stores.js`).then((m) => m[title]);
    if (!store) return;
  });

  onMount(() => {
    mounted = true;
  });
  const handleInput = (e: Event) => {
    if (!store) return;
    store.set(Number((e.target as HTMLInputElement).value));
  };

  $: {
    steps = (max - min) / step;
  }
</script>

<div class="range-input">
  <Layout gap="1" align="end" justify="between">
    {#if mounted}
      {#each Array.from({ length: steps }, (_, i) => i++) as step}
        <div
          class="step {step % 2 === 0 ? 'even' : 'odd'}"
          style="--i: {step}; --steps: {steps}"
          class:mounted
        />
      {/each}
    {/if}
    {#if mounted}
      <input
        data-interactable
        {disabled}
        {min}
        {max}
        {step}
        {title}
        value={$store}
        on:input={handleInput}
        type="range"
      />
    {/if}

    <Layout horizontal gap="1" align="end" justify="between">
      <p>{min.toFixed(2).toString()}</p>
      <p>{$store?.toFixed(2).toString()}</p>
      <p>{max.toFixed(2).toString()}</p>
    </Layout>
    <p>{text}</p>
  </Layout>
</div>

<style lang="scss">
  .range-input {
    min-width: 144px;
    white-space: nowrap;
    box-sizing: border-box;
  }

  input {
    appearance: none;
    -webkit-appearance: none;
    height: 100%;
    width: 100%;
    margin: 0;
    background-color: transparent;
  }

  .step {
    position: absolute;
    height: 0px;
    width: 1px;
    top: 13px;
    background-color: var(--c-tertiary);
    left: calc(var(--i) * (100% / var(--steps)));

    transition: 350ms var(--ease);
  }
  .even {
    background-color: var(--c-tertiary);
    height: 0px;
    top: 10px;
  }
  .mounted.even {
    height: 8px;
  }

  .mounted.odd {
    height: 4px;
  }
  input:focus {
    outline: none;
  }

  input::-webkit-slider-runnable-track {
    width: 100%;
    height: 24px;
    // padding: 0 8px 0 8px;
  }
  input::-webkit-slider-thumb {
    animation: blink2 1.5s var(--ease) infinite alternate;
    height: 12px;
    width: 24px;
    background-color: var(--text-color);
    -webkit-appearance: none;
    transform: translateY(8px);
    transition: 100ms var(--ease);
    transform-origin: center;
  }
  input:hover::-webkit-slider-thumb,
  input:focus-visible::-webkit-slider-thumb {
    transform: translateY(2px);
    border: 1pt solid white;
  }
</style>
