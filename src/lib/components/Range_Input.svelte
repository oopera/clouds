<script lang="ts">
  import { onMount } from 'svelte';
  import Text from './Text.svelte';
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

  onMount(async () => {
    store = await import(`../stores/stores.js`).then((m) => m[title]);
    if (!store) return;
  });

  const handleInput = (e: Event) => {
    if (!store) return;
    store.set(Number((e.target as HTMLInputElement).value));
  };

  $: {
    steps = (max - min) / step;
  }
</script>

<div class="range-input-container">
  <Layout gap="1" align="end" justify="between">
    {#each Array.from({ length: steps }, (_, i) => i + 1) as step}
      <div
        class="step {step % 2 === 0 ? 'even' : 'odd'}"
        style="--i: {step}; --steps: {steps}"
      />
    {/each}
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
      class="slider"
    />

    <Layout horizontal gap="1" align="end" justify="between">
      <Text {delay} secondary text={min.toFixed(2).toString()} vertical />
      <Text {delay} tertiary text={$store?.toFixed(2).toString()} vertical />
      <Text {delay} secondary text={max.toFixed(2).toString()} vertical />
    </Layout>
    <Text {delay} {text} vertical />
  </Layout>
</div>

<style lang="scss">
  .range-input-container {
    min-width: 144px;
    white-space: nowrap;
    box-sizing: border-box;
    z-index: 2;
  }

  .slider {
    appearance: none;
    -webkit-appearance: none;
    height: 100%;
    width: 100%;
    margin: 0;
    background-color: transparent;
  }

  .step {
    position: absolute;
    height: 16px;
    width: 1px;
    top: 8px;
    background-color: var(--c-tertiary);
    left: calc(var(--i) * (100% / var(--steps)));
  }
  .even {
    background-color: var(--c-tertiary);
    height: 8px;
    top: 12px;
  }
  .slider:focus {
    outline: none;
  }

  .slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 24px;
    // padding: 0 8px 0 8px;
  }
  .slider::-webkit-slider-thumb {
    animation: blink2 1.5s ease-in-out infinite alternate;
    height: 24px;
    width: 24px;
    border-radius: 15px;
    border: 1pt solid var(--c-g);
    -webkit-appearance: none;
    margin-top: 4px;
    transition: 100ms ease-in;
    transform-origin: center;
    backdrop-filter: blur(8px);
    background: radial-gradient(
      circle,
      rgb(255, 255, 255) 0%,
      rgba(33, 33, 39, 1) 30%,
      rgba(0, 0, 0, 0) 100%
    );
  }
  .slider:hover::-webkit-slider-thumb,
  .slider:focus-visible::-webkit-slider-thumb {
    height: 24px;
    width: 24px;
    margin-top: 4px;
    border: 1pt solid white;
  }
</style>
