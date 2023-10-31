<script lang="ts">
  export let text: string = '';
  let isHovered: boolean = false;

  const handleMouseEnter = () => {
    isHovered = true;
  };

  const handleMouseLeave = () => {
    isHovered = false;
  };
</script>

<div
  class="tooltip"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
>
  <slot />
  <div class="tooltip-content {isHovered ? 'visible' : ''}">
    <p>{text}</p>
  </div>
</div>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  .tooltip {
    position: relative;
  }
  .tooltip-content {
    position: absolute;
    height: fit-content;
    top: 100%;
    right: 100%;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.35s var(--ease), visibility 0.35s var(--ease);
    background: rgba(0, 0, 0, 1);
    pointer-events: none;
    z-index: 1;
    p {
      font-size: 0.75rem;
      padding: 1rem;

      border-radius: 0.25rem;
      color: white;
      text-align: center;
      pointer-events: none;
    }
  }
  .visible {
    opacity: 1;
    visibility: visible;
  }
</style>
