<script lang="ts">
  import { onMount } from 'svelte';
  import { zoom } from '$lib/stores/stores';
  import Text from './Text.svelte';

  let zoomValue = 0;

  onMount(() => {
    zoom.subscribe((value) => {
      zoomValue = value;
    });
  });
</script>

<div class="viewfinder">
  {#each Array.from(Array(90)) as _, i}
    <div class={`viewfinder__tick ${i % 10 === 0 ? 'even' : 'odd'}`}>
      {#if i % 10 === 0}
        <div class="viewfinder__tick__text">{i}</div>
      {/if}
    </div>
  {/each}
  <div data-hud class="crosshair">
    <div class="crosshair__horizontal" />
    <div class="crosshair__vertical" />
  </div>
  <div data-hud class="circle" style="--z:{zoomValue}" />
  <div data-hud class="circle" style="--z:{zoomValue}" />
</div>

<style lang="scss">
  .viewfinder {
    width: 160px;
    height: 160px;
    aspect-ratio: 1/1;
    border-radius: 150px;
    z-index: 1;
    position: relative;
    background: radial-gradient(
      circle,
      rgba(0, 33, 95, 0.25) 0%,
      rgba(33, 33, 39, 0.05) 30%,
      rgba(0, 0, 0, 0) 50%
    );
    backdrop-filter: blur(24px);
    border: 1pt solid white;
  }

  .viewfinder__tick {
    width: 10px;
    height: 1px;
    background: white;
    position: absolute;
    top: 50%; /* Center vertically */
    left: 50%; /* Center horizontally */
    transform-origin: top left;
  }
  .viewfinder__tick__text {
    position: absolute;
    top: 8px;
    left: 8px;
    transform: translate(-50%, -50%);
    font-size: 10px;
    transform: translateX(12px);
    font-family: var(--font-family-mono);
  }
  .odd {
    width: 12px;
  }

  @for $i from 1 through 360 {
    .viewfinder__tick:nth-of-type(#{$i}) {
      transform: rotate(calc(4deg * #{$i})) translateX(80px);
    }
  }

  .crosshair {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .crosshair__horizontal {
    width: 80%;
    height: 1px;
    background: radial-gradient(
      circle,
      rgb(225, 225, 225) 0%,
      rgb(36, 85, 76) 30%,
      rgba(11, 17, 17, 0) 100%
    );

    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .crosshair__vertical {
    width: 1px;
    height: 80%;
    background: radial-gradient(
      circle,
      rgb(225, 225, 225) 0%,
      rgb(36, 85, 76) 30%,
      rgba(11, 17, 17, 0) 100%
    );
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .circle {
    width: 128px;
    aspect-ratio: 1/1;
    border-radius: 150px;
    border: 1pt solid white;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* transition: 150ms var(--ease); */
  }
  .circle:nth-child(2) {
    width: calc(100% - (32px * var(--z)));
    border: 1.25pt solid var(--c-g);
  }
  .circle:nth-child(3) {
    width: calc(100% - (24px * var(--z)));
    border: 1.25pt solid var(--c-g);
  }
</style>
