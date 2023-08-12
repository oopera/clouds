<script lang="ts">
  import { onMount } from 'svelte';
  import Text from './Text.svelte';
  import type { Stores } from '$lib/types/types';

  export let title: Stores;

  export let step: number = 1;
  export let min: number = 0;
  export let max: number = 100;
  export let disabled: boolean = false;
  export let delay: number = 1;
  let text: Stores = title;
  let store: any;

  onMount(async () => {
    store = await import(`./../stores/stores.js`).then((m) => m[title]);
    if (!store) return;
  });

  const handleInput = (e: Event) => {
    if (!store) return;
    store.set(Number((e.target as HTMLInputElement).value));
  };
</script>

<div class="range-input-container">
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
  <Text {delay} {text} vertical />
</div>

<style lang="scss">
  .range-input-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    gap: 16px;
    min-width: 144px;
    white-space: nowrap;
    box-sizing: border-box;
  }
  .slider {
    appearance: none;
    -webkit-appearance: none;
    height: 32px;
    width: 100%;
    margin: 0;
    border-radius: 25px;
    background-color: transparent;
  }
  .slider:focus {
    outline: none;
  }

  .slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 32px;
    padding: 0 8px 0 8px;
    border-radius: 24px;
    border: 1pt solid var(--c-g);
  }
  .slider::-webkit-slider-thumb {
    animation: blink2 1.5s ease-in-out infinite alternate;
    height: 16px;
    width: 16px;
    border-radius: 15px;
    border: 1pt solid var(--c-g);
    -webkit-appearance: none;
    margin-top: 8px;
    transition: 100ms ease-in;
    transform-origin: center;
    background: radial-gradient(
      circle,
      rgba(0, 33, 95, 1) 0%,
      rgba(33, 33, 39, 0.05) 30%,
      rgba(0, 0, 0, 0) 50%
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
