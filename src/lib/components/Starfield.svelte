<script lang="ts">
  import { onMount } from 'svelte';
  import { zoom } from '$lib/stores/stores';

  let zoomValue = 0;

  onMount(() => {
    zoom.subscribe((value) => {
      zoomValue = value;
    });
  });
</script>

<div id="hud" class="viewfinder">
  <div class="hud">
    <div data-hud class="crosshair">
      <div class="crosshair__horizontal" />
      <div class="crosshair__vertical" />
      <p class="indicator">{parseFloat(zoomValue.toFixed(4))}</p>
    </div>
    <div data-hud class="circle" style="--z:{zoomValue}" />
    <div data-hud class="circle" style="--z:{zoomValue}" />
  </div>
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
  }
  .hud {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 160px;
  }

  .indicator {
    position: relative;
    top: 75%;
    left: 75%;
    transform: translate(-50%, -50%);
    color: rgb(196, 215, 255);
    font-size: 10px;
    font-weight: 200;
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
    /* transition: 150ms ease-in-out; */
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
