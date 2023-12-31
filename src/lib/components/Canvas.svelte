<script lang="ts">
  import init from '$lib/shaders/init';
  import {
    zoom,
    setZoom,
    dragging,
    pitch,
    yaw,
    setPitch,
    setYaw,
  } from '$lib/stores/stores';
  import { onMount } from 'svelte';

  let initialX = 0;
  let initialY = 0;

  const max_zoom = 35;
  const min_zoom = 21;

  onMount(() => {
    init();

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    window.addEventListener('wheel', handleScroll, { passive: false });
    window.addEventListener('touchmove', handleTouch, { passive: false });

    document.addEventListener('mousedown', handlemousedown);
    document.addEventListener('mouseup', handlemouseup);
    document.addEventListener('mousemove', handlemousemove);

    // Todo bind keyboard events
  });

  const handleScroll = (e: WheelEvent) => {
    e.preventDefault();

    let newZoom = $zoom + e.deltaY * 0.0025;
    if (newZoom > min_zoom && newZoom < max_zoom) {
      newZoom = $zoom + e.deltaY * 0.0025 * ($zoom / max_zoom);
    }

    let finalZoom = Math.max(min_zoom, Math.min(newZoom, max_zoom));

    setZoom(finalZoom, true);
  };

  const handleTouch = (e: TouchEvent) => {
    e.preventDefault();

    let newZoom = $zoom + e.touches[0].clientY * 0.0025;
    if (newZoom > min_zoom && newZoom < max_zoom) {
      newZoom = $zoom + e.touches[0].clientY * 0.0025 * ($zoom / max_zoom);
    }

    let finalZoom = Math.max(min_zoom, Math.min(newZoom, max_zoom));

    setZoom(finalZoom, true);
  };

  const handlemouseup = (e: MouseEvent) => {
    dragging.set(false);

    initialX = 0;
    initialY = 0;
  };

  const handlemousemove = (e: MouseEvent) => {
    if ($dragging) {
      const changeX = e.clientX - initialX;
      const changeY = e.clientY - initialY;

      const newPitch = $pitch + 0.1 * changeY * Math.pow($zoom, 0.25);
      const newYaw = $yaw - 0.1 * changeX * Math.pow($zoom, 0.25);

      setPitch(Math.max(-89, Math.min(89, newPitch)), false);
      setYaw(newYaw, false);

      initialX = e.clientX;
      initialY = e.clientY;
    }
  };

  const handlemousedown = (e: MouseEvent) => {
    const targetElement = e.target as HTMLElement;

    // Check if the target element is interactable by its tag name
    const interactableTags = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'];
    if (interactableTags.includes(targetElement.tagName.toUpperCase())) {
      return;
    }

    dragging.set(true);

    initialX = e.clientX;
    initialY = e.clientY;
  };
</script>

<canvas id="canvas" />

<style lang="scss">
  canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 1;
    pointer-events: none;
    aspect-ratio: 1/1;
  }
</style>
