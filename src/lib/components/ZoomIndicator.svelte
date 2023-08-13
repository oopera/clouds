<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { zoom, loading, yaw, pitch } from './../stores/stores.js';
  import { quintOut } from 'svelte/easing';
  import Text from './Text.svelte';

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
    {#each indicatorArray as i}
      <div
        style="--i: {i}; "
        class="zoom__indicator {i + 1 === Math.floor($zoom) ? 'current' : ''}"
      >
        <Text
          tertiary={i + 1 === Math.floor($zoom)}
          secondary={i + 1 !== Math.floor($zoom)}
          text={`${i / 2}`}
          delay={i}
        />

        {#if i !== 9}
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
  <span class="rotate">
    <Text text={`zoom`} />
  </span>
</div>

<style lang="scss">
  .current {
    p {
      color: var(--c-tertiary);
    }
    background-color: var(--c-blue);
  }

  .rotate {
    margin: 0;
    padding: 0;
    rotate: 90deg;
    transform: translateY(10px);
    p {
      margin: 0;
      padding: 0;
    }
  }

  .zoom {
    position: relative;
    align-items: center;
    display: flex;
    height: 224px;
    width: fit-content;
    z-index: 1;

    &__bar {
      display: flex;
      width: 32px;
      height: 100%;
      justify-content: space-between;
      flex-direction: column;
      position: relative;
      pointer-events: none;
      overflow: hidden;
      outline: none;
      backdrop-filter: blur(24px);
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
    height: 32px;
    width: 224px;
    margin: 0;
    border-radius: 25px;
    background-color: transparent;
    rotate: 90deg;
    transform-origin: top left;
    top: 0;
    left: 32px;
    &::-webkit-slider-runnable-track {
      width: 32px;
      height: 32px;
      opacity: 0;
    }
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
