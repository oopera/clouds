<script lang="ts">
  import Text from '$lib/components/Text.svelte';
  import { zoom, pitch, yaw } from '$lib/stores/stores';
  import Layout from './Layout.svelte';
</script>

<div id="hud" class="viewfinder">
  <div class="hud">
    <div class="crosshair">
      <div style="--z:{$yaw + 'deg'}" class="crosshair__horizontal" />
      <div style="--z:{$pitch + 'deg'}" class="crosshair__vertical" />
      <div style="--z:{$yaw + 'deg'}" class="crosshair__depth" />
    </div>
    <div class="circle" style="--z:{$yaw + 'deg'}; --zo:{$zoom}" />
    <div class="circle" style="--z:{$pitch + 'deg'}; --zo:{$zoom}" />
    <div class="circle" style="--z:{$yaw + 'deg'}; --zo:{$zoom}" />
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
    display: flex;
  }
  .hud {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;

    border-radius: 160px;
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
    transform: translate(-50%, -50%) rotate3d(0, 1, 0, var(--z));
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
    transform: translate(-50%, -50%) rotate3d(0, 1, 1, var(--z));
  }
  .crosshair__depth {
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
    transform: translate(-50%, -50%) rotate3d(1, 1, 1, calc(var(--z)));
  }

  .circle {
    width: 84px;
    aspect-ratio: 1/1;
    border-radius: 150px;
    border: 1px solid white;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    font-size: 0.25rem;
    color: var(--c-tertiary);

    // justify-content: center;
  }

  .circle:nth-child(2) {
    border: 1.25pt solid var(--c-g);
    transform: translate(-50%, -50%) rotate3d(0, 1, 0, calc(var(--z)))
      scale(calc(2 - (var(--zo) / 5)));
  }

  .circle:nth-child(3) {
    border: 1.25pt solid var(--c-g);
    transform: translate(-50%, -50%) rotate3d(0, 0, 1, var(--z))
      scale(calc(2 - (var(--zo) / 5)));
  }
  .circle:nth-child(4) {
    border: 1.25pt solid var(--c-g);
    transform: translate(-50%, -50%) rotate3d(1, 1, 1, calc(var(--z)))
      scale(calc(2 - (var(--zo) / 5)));
  }
</style>