<script lang="ts">
  import { setZoom, zoom } from '../stores/stores.js';
  import Text from './Text.svelte';

  export let step: number = 1;
  export let min: number = 2.65;
  export let max: number = 12.65;
  export let delay: number = 0;

  const handleInput = (e: Event) => {
    let finalZoom = Math.max(
      min,
      Math.min(Number((e.target as HTMLInputElement).value), max)
    );
    setZoom(finalZoom, true);
  };

  const indicatorArray = Array.from({ length: 10 }, (_, i) => i + 1);
</script>

<div class="zoom" style="--zoom: {$zoom};">
  <div class="zoom__bar">
    {#each indicatorArray as i}
      <div style="--i: {i}; " class="zoom__indicator">
        <Text
          tertiary={$zoom - min + 1 >= i && $zoom - min + 1 <= i + 1}
          text={`${i.toFixed(4)}`}
          delay={i + delay}
          mini
        />

        {#if i !== 10}
          <div class="zoom__indicator__divider" />
        {/if}
      </div>
    {/each}
  </div>
  <input
    data-interactable
    value={$zoom}
    {min}
    {max}
    {step}
    on:input={handleInput}
    type="range"
  />
</div>

<style lang="scss">
  .zoom {
    position: relative;
    align-items: center;
    display: flex;
    height: fit-content;
    z-index: 1;
    width: 15px;

    &__bar {
      display: flex;
      width: 16px;
      gap: 10px;
      height: 100%;
      justify-content: space-between;
      flex-direction: column;
      position: relative;
      pointer-events: none;
      overflow: hidden;
      outline: none;
    }
    &__indicator {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      &__divider {
        position: relative;
        transform: translateX(2px);
        height: 1px;
        width: calc(16px - var(--zoom) * 2px);
        background: rgba(
          calc((var(--i) + 1) / var(--zoom) * 255),
          calc((var(--i) + 1) / var(--zoom) * 255),
          calc((var(--i) + 1) / var(--zoom) * 255)
        );
      }
    }
  }

  input {
    position: absolute;
    appearance: none;
    -webkit-appearance: none;
    height: 46px;
    width: 473px;
    margin: 0;
    background-color: transparent;
    rotate: 90deg;
    transform-origin: top left;
    top: 0;
    left: 46px;
    &::-webkit-slider-runnable-track {
      opacity: 1;
      height: 46px;
      width: 473px;
    }
    &::-webkit-slider-thumb {
      opacity: 0;
    }
  }
</style>
