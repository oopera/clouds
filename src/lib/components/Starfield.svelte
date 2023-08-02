<script lang="ts">
  import { onMount } from 'svelte';
  import { zoom, pitch, yaw, rotation_speed } from '$lib/stores/stores';

  let isHovering = false;
  let zoomValue = 0;
  let pitchV: number = 0;
  let yawV: number = 0;
  let rotationSpeed = 0;
  let initialRot = 0;

  rotation_speed.subscribe((value) => {
    rotationSpeed = value;
  });

  pitch.subscribe((value) => {
    pitchV = value;
  });

  yaw.subscribe((value) => {
    yawV = value;
  });

  function handleHover(e: MouseEvent) {
    const elements = document.querySelectorAll('[data-hud]');
    if (isHovering) {
      // let interval = setInterval(() => {
      const container = e.currentTarget as HTMLElement;
      const containerRect = container.getBoundingClientRect();
      const containerCenterX = containerRect.left + containerRect.width / 2;
      const containerCenterY = containerRect.top + containerRect.height / 2;
      const maxOffset = 75;
      const xOffset = e.clientX - containerCenterX;
      const yOffset = e.clientY - containerCenterY;

      pitch.set(pitchV + yOffset / 100);
      yaw.set(yawV + xOffset / 100);
      rotation_speed.set(0);

      elements.forEach((el: Element, i) => {
        const positionX =
          ((xOffset / containerRect.width) *
            maxOffset *
            (elements.length - i)) /
          10;
        const positionY =
          ((yOffset / containerRect.height) *
            maxOffset *
            (elements.length - i)) /
          10;

        (el as HTMLElement).style.top = `calc(50% + ${positionY}px)`;
        (el as HTMLElement).style.left = `calc(50% + ${positionX}px)`;
        (el as HTMLElement).style.transition = `0ms all`;
      });
      // }, 250);
      // return () => clearInterval(interval);
    }
  }

  const handleMouseEnter = () => {
    isHovering = true;
    initialRot = rotationSpeed;
  };

  const handleMouseLeave = () => {
    isHovering = false;
    const elements = document.querySelectorAll('[data-hud]');
    elements.forEach((el, i) => {
      (el as HTMLElement).style.top = ``;
      (el as HTMLElement).style.left = ``;
      (el as HTMLElement).style.transition = ``;
    });
    rotation_speed.set(initialRot);
  };

  onMount(() => {
    zoom.subscribe((value) => {
      zoomValue = value;
    });
  });
</script>

<div
  id="hud"
  class="viewfinder"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  on:mousemove={handleHover}
>
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

    &::before {
      content: '';
      top: -8px;
      left: -8px;
      backdrop-filter: blur(25px);
      // background-color: rgba(255, 255, 255, 0.25);
      width: 176px;
      height: 176px;
      position: absolute;
      // border: 1pt solid var(--c-g);
      border-radius: 16px;
      rotate: 45deg;
    }
    background: radial-gradient(
      circle,
      rgb(0, 33, 95) 0%,
      rgba(33, 33, 39, 0) 30%,
      rgba(0, 0, 0, 0) 100%
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
    border: 1.25pt solid rgba(225, 225, 225, 0.1);
  }
  .circle:nth-child(3) {
    width: calc(100% - (24px * var(--z)));
    border: 1.5pt solid rgba(225, 225, 225, 0.2);
  }
</style>
