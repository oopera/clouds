<script lang="ts">
  import { zoom, pitch, yaw, loading } from '$lib/stores/stores';
  import type { LoadingStore } from '$lib/types/types';
  import { onMount } from 'svelte';

  let loadedItems: LoadingStore;
  loading.subscribe((value: LoadingStore) => {
    loadedItems = value;
  });

  let mounted: boolean = false;

  $: if ($loading.welcome.status) {
    mounted = false;
  } else {
    mounted = true;
  }
</script>

<div class="viewfinder" class:mounted>
  {#each Array.from(Array(91)) as _, i}
    <div class={`viewfinder__tick ${i % 10 === 0 ? 'even' : 'odd'}`}>
      {#if i % 10 === 0}
        <div class="viewfinder__tick__text">{i}</div>
      {/if}
    </div>
  {/each}
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
  @import '$lib/styles/mixins.scss';
  .viewfinder {
    margin-bottom: gap(3);
    width: 60px;
    height: 60px;
    aspect-ratio: 1/1;
    border-radius: 150px;
    opacity: 0;
    position: absolute;
    display: none;
    backdrop-filter: blur(16px);
    pointer-events: all;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%) translateY(100%);
    transition: transform 750ms var(--ease), opacity 750ms var(--ease);
    &:hover {
      .viewfinder__tick__text {
        opacity: 1;
      }
      @for $i from 1 through 91 {
        .viewfinder__tick:nth-of-type(#{$i}) {
          rotate: calc(4deg * #{$i});
          transform: translateX(40px);
        }
      }
    }
    @include l {
      display: flex;
    }
  }
  .mounted {
    opacity: 1;
    transform: translateX(-50%) translateY(0%);
    transition: transform 750ms var(--ease), opacity 750ms var(--ease);
  }
  .viewfinder__tick {
    width: gap(2);
    height: 1px;
    background: var(--c-tertiary);
    position: absolute;
    top: 50%; /* Center vertically */
    left: 50%; /* Center horizontally */
    transform-origin: top left;
    transition: 350ms var(--ease);
  }
  .viewfinder__tick__text {
    color: var(--c-tertiary);
    position: absolute;
    top: gap(1);
    left: gap(1);
    font-size: 10px;
    transform: translateX(gap(1)) translateY(gap(-2)) rotate(0deg);
    font-family: var(--font-family-mono);
    opacity: 0.5;
    transition: opacity var(--ease) 350ms;
  }
  .odd {
    width: gap(1);
    background: var(--c-secondary);
  }

  @for $i from 1 through 91 {
    .viewfinder__tick:nth-of-type(#{$i}) {
      rotate: calc(-2deg * #{$i});
      transform: translateX(40px);
    }
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
    background: var(--star-gradient);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate3d(0, 1, 0, calc(var(--z)));
  }

  .crosshair__vertical {
    width: 1px;
    height: 80%;
    background: var(--star-gradient);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate3d(0, 1, 1, calc(var(--z)));
  }
  .crosshair__depth {
    width: 1px;
    height: 80%;
    background: var(--star-gradient);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate3d(1, 1, 1, calc(var(--z)));
  }

  .circle {
    width: 80%;
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
    border: 1pt solid var(--c-tertiary);
    transform: translate(-50%, -50%) rotate3d(0, 1, 0, calc(var(--z)));
  }

  .circle:nth-child(3) {
    border: 1pt solid var(--c-tertiary);
    transform: translate(-50%, -50%) rotate3d(0, 1, 1, calc(var(--z)));
  }
  .circle:nth-child(4) {
    border: 1pt solid var(--c-tertiary);
    transform: translate(-50%, -50%) rotate3d(1, 1, 1, calc(var(--z)));
  }
</style>
