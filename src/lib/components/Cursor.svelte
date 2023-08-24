<script lang="ts">
  import { onMount } from 'svelte';

  let x = 0;
  let y = 0;
  let interactable = false;
  let controls = false;

  onMount(() => {
    window.onmousemove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;

      controls = (e.target as HTMLElement).closest('[data-hud]') !== null;
      interactable =
        (e.target as HTMLElement).closest('[data-interactable]') !== null;
    };
  });
</script>

<div class="cursor" style="transform: translate({x - 5}px, {y - 5}px">
  <div class:interactable class:controls class="cursor-inner">
    <div class="crosshair-line" />
    <div class="crosshair-line" />
    <div class="crosshair-line" />
    <div class="crosshair-line" />
    <div class="crosshair-edge" />
    <div class="crosshair-edge" />
    <div class="crosshair-edge" />
    <div class="crosshair-edge" />
  </div>
</div>

<style lang="scss">
  .cursor {
    pointer-events: none;
    z-index: 100;
    width: 24px;
    height: 24px;
    left: -7px;
    top: -6px;
    position: fixed;
    mix-blend-mode: difference;
  }

  .cursor-inner {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .crosshair-line {
    position: absolute;
    width: 20%;
    height: 1px;
    background-color: white;
    --offset: 4px;
    transition: 150ms var(--ease);
  }
  .crosshair-edge {
    position: absolute;
    width: 4px;
    height: 4px;
    transition: 150ms var(--ease);
  }

  .crosshair-line:nth-child(1) {
    top: 50%;
    left: 0;
    transform: translate(4px, -50%);
  }
  .crosshair-line:nth-child(2) {
    top: 50%;
    right: 0;
    transform: translate(-4px, -50%);
  }
  .crosshair-line:nth-child(3) {
    left: 50%;
    top: 0;
    width: 1px;
    height: 20%;
    transform: translate(-50%, 4px);
  }
  .crosshair-line:nth-child(4) {
    left: 50%;
    bottom: 0;
    width: 1px;
    height: 20%;
    transform: translate(-50%, -4px);
  }

  .crosshair-edge:nth-child(5) {
    top: 4px;
    left: 4px;
    border-top: 1px solid white;
    border-left: 1px solid white;
  }

  .crosshair-edge:nth-child(6) {
    top: 4px;
    right: 4px;
    border-top: 1px solid white;
    border-right: 1px solid white;
  }

  .crosshair-edge:nth-child(7) {
    bottom: 4px;
    left: 4px;
    border-bottom: 1px solid white;
    border-left: 1px solid white;
  }

  .crosshair-edge:nth-child(8) {
    bottom: 4px;
    right: 4px;
    border-bottom: 1px solid white;
    border-right: 1px solid white;
  }

  .interactable {
    // Loop for .crosshair-line
    @for $i from 1 through 4 {
      .crosshair-line:nth-child(#{$i}) {
        @if $i == 1 {
          transform: translate(-5px, -50%);
        } @else if $i == 2 {
          transform: translate(5px, -50%);
        } @else if $i == 3 {
          transform: translate(-50%, -5px);
        } @else if $i == 4 {
          transform: translate(-50%, 5px);
        }
      }
    }

    // Loop for .crosshair-edge
    $positions: (top left, top right, bottom left, bottom right);
    @for $i from 1 through length($positions) {
      .crosshair-edge:nth-child(#{$i}) {
        $position: nth($positions, $i);
        #{nth($position, 1)}: 8px;
        #{nth($position, 2)}: 8px;
      }
    }
  }

  .controls {
    @for $i from 1 through 4 {
      .crosshair-line:nth-child(#{$i}) {
        @if $i == 1 {
          transform: translate(-5px, -50%);
        } @else if $i == 2 {
          transform: translate(5px, -50%);
        } @else if $i == 3 {
          transform: translate(-50%, -5px);
        } @else if $i == 4 {
          transform: translate(-50%, 5px);
        }
      }
    }
  }
</style>
