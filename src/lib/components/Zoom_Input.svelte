<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { zoom, loading, yaw, pitch } from '../stores/stores.js';
  import { quintOut } from 'svelte/easing';
  import Text from './Text.svelte';

  export let step: number = 1;
  export let min: number = 2.25;
  export let max: number = 7.25;
  export let delay: number = 0;

  const tweenedZoom = tweened(100, {
    duration: 2500,
    easing: quintOut,
  });

  const tweenedYaw = tweened(1, {
    duration: 2500,
    easing: quintOut,
  });

  const tweenedPitch = tweened(1, {
    duration: 2500,
    easing: quintOut,
  });

  tweenedZoom.subscribe((value) => {
    zoom.update((n) => (n = value));
  });

  tweenedYaw.subscribe((value) => {
    yaw.update((n) => (n = value));
  });

  tweenedPitch.subscribe((value) => {
    pitch.update((n) => (n = value));
  });

  onMount(() => {
    window.addEventListener('wheel', handleScroll, { passive: false });
  });

  $: {
    if (!$loading.welcome.status) {
      tweenedZoom.set(3.0);
      tweenedYaw.set(720);
      tweenedPitch.set(45);
    }
  }

  const handleScroll = (e: WheelEvent) => {
    e.preventDefault();

    let newZoom = $zoom + e.deltaY * 0.0025;
    if (newZoom > 2.25 && newZoom < 7.25) {
      newZoom = $zoom + e.deltaY * 0.0025 * ($zoom / 7.25);
    }

    let finalZoom = Math.max(2.25, Math.min(newZoom, 7.25));

    tweenedZoom.set(finalZoom);
  };

  const handleInput = (e: Event) => {
    if (!tweenedZoom) return;
    let finalZoom = Math.max(
      2.25,
      Math.min(Number((e.target as HTMLInputElement).value), 7.25)
    );
    tweenedZoom.set(finalZoom);
  };

  const indicatorArray = Array.from({ length: 10 }, (_, i) => i + 1);
</script>

<div class="zoom" style="--zoom: {$zoom};">
  <div class="zoom__bar">
    {#each indicatorArray as i}
      <div style="--i: {i}; " class="zoom__indicator">
        <Text
          tertiary={($zoom - 2.25) * 2 >= i && ($zoom - 2.25) * 2 <= i + 1}
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
    class="slider"
    id="zoom-input"
  />
</div>

<style lang="scss">
  .rotate {
    rotate: 90deg;
    transform: translateY(0px);
  }

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

  .slider {
    position: absolute;
    appearance: none;
    -webkit-appearance: none;
    height: 46px;
    width: 224px;
    margin: 0;
    background-color: transparent;
    rotate: 90deg;
    transform-origin: top left;
    top: 0;
    left: 46px;
    &::-webkit-slider-runnable-track {
      opacity: 1;
      height: 46px;
      width: 224px;
    }
    &::-webkit-slider-thumb {
      opacity: 0;
    }
  }
</style>
