<script lang="ts">
  import { onMount } from 'svelte';

  let x = 0;
  let y = 0;
  let interactable = false;
  let controls = false;

  onMount(() => {
    window.onmousemove = (e) => {
      x = e.clientX;
      y = e.clientY;
      controls = e.target.closest('[data-hud]') !== null;
      interactable = e.target.closest('[data-interactable]') !== null;
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

<style>
  .cursor {
    pointer-events: none;
    z-index: 100;
    width: 24px;
    height: 24px;
    left: -12px;
    top: -12px;
    /* backdrop-filter: blur(24px); */
    position: fixed;
    /* transition: all 150ms cubic-bezier(0.25, 0.8, 0.25, 1); */
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
    transition: 150ms ease;
  }
  .crosshair-edge {
    position: absolute;
    width: 4px;
    height: 4px;
    transition: 150ms ease;
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

  .interactable .crosshair-line:nth-child(1) {
    transform: translate(-5px, -50%);
  }
  .interactable .crosshair-line:nth-child(2) {
    transform: translate(5px, -50%);
  }
  .interactable .crosshair-line:nth-child(3) {
    transform: translate(-50%, -5px);
  }
  .interactable .crosshair-line:nth-child(4) {
    transform: translate(-50%, 5px);
  }

  .interactable .crosshair-edge:nth-child(5) {
    top: 8px;
    left: 8px;
  }

  .interactable .crosshair-edge:nth-child(6) {
    top: 8px;
    right: 8px;
  }

  .interactable .crosshair-edge:nth-child(7) {
    bottom: 8px;
    left: 8px;
  }

  .interactable .crosshair-edge:nth-child(8) {
    bottom: 8px;
    right: 8px;
  }

  .controls .crosshair-line:nth-child(1) {
    transform: translate(-5px, -50%);
  }
  .controls .crosshair-line:nth-child(2) {
    transform: translate(5px, -50%);
  }
  .controls .crosshair-line:nth-child(3) {
    transform: translate(-50%, -5px);
  }
  .controls .crosshair-line:nth-child(4) {
    transform: translate(-50%, 5px);
  }
</style>
