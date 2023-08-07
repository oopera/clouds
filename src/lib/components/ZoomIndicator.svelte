<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { zoom, loading, yaw, pitch } from './../stores/stores.js';
  import { quadOut, quintOut } from 'svelte/easing';

  export let step: number = 0.0025;
  export let min: number = 1;
  export let max: number = 10;

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
    if (newZoom > 2.25 && newZoom < 10) {
      newZoom = $zoom + e.deltaY * 0.0025 * ($zoom / 10);
    }

    let finalZoom = Math.max(2.25, Math.min(newZoom, 10));

    tweenedZoom.set(finalZoom);
  };

  const handleInput = (e: Event) => {
    if (!tweenedZoom) return;
    let finalZoom = Math.max(
      2.25,
      Math.min(Number((e.target as HTMLInputElement).value), 10)
    );
    tweenedZoom.set(finalZoom);
  };

  const indicatorArray = Array.from({ length: 10 }, (_, i) => i + 1);
</script>

<div class="zoom" style="--zoom: {$zoom};">
  <div class="zoom__bar">
    {#each indicatorArray as indicator, i}
      <div
        style="--i: {i}; "
        class="zoom__indicator {i + 1 === Math.floor($zoom) ? 'current' : ''}"
      >
        <p class="zoom__indicator__number">
          {i / 2}
        </p>
        {#if i !== 9}
          <div class="zoom__indicator__divider" />
        {/if}
      </div>
    {/each}
  </div>
  <input
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
  .current {
    p {
      color: yellow;
    }
  }

  .zoom {
    display: flex;
    flex-direction: column;
    align-items: center;
    rotate: 90deg;
    transform: translateY(108px);
    height: 48px;
    z-index: 1;
    &__bar {
      display: flex;
      width: 100%;
      height: 24px;
      justify-content: space-between;
      position: absolute;
      pointer-events: none;
      border-radius: 24px;
      overflow: hidden;
      outline: none;
      backdrop-filter: blur(24px);
    }
    &__indicator {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      &__number {
        margin: 0;
        padding: 0;
        color: rgba(
          calc((var(--i) + 1) / var(--zoom) * 255),
          calc((var(--i) + 1) / var(--zoom) * 255),
          calc((var(--i) + 1) / var(--zoom) * 255)
        );
        rotate: -90deg;
      }
      &__divider {
        position: absolute;
        left: 15px;
        transform: translateX(2px);
        width: 1px;
        height: calc(16px - var(--zoom) * 2px);
        background: rgba(
          calc((var(--i) + 1) / var(--zoom) * 255),
          calc((var(--i) + 1) / var(--zoom) * 255),
          calc((var(--i) + 1) / var(--zoom) * 255)
        );
      }
    }
  }

  .slider {
    appearance: none;
    -webkit-appearance: none;
    height: 32px;
    width: 224px;
    margin: 0;
    height: 48px;
    border-radius: 25px;
    background-color: transparent;
    &::-webkit-slider-runnable-track {
      width: 32px;
      height: 32px;
      opacity: 0;
    }
  }
</style>
