<script lang="ts">
  let mounted: boolean = false;

  function actionWhenInViewport(e: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        mounted = true;
      }
    });

    observer.observe(e);
  }

  function slideIn(node, { delay = 0, duration = 750 }) {
    const o = +getComputedStyle(node).width.replace('px', '');

    return {
      delay,
      duration,
      css: (t) => `width: ${t * o}px`,
    };
  }
</script>

<div
  class="line"
  class:mounted
  use:actionWhenInViewport
  out:slideIn={{
    duration: 150,
  }}
/>

<style lang="scss">
  @import '$lib/styles/mixins.scss';

  .line {
    width: 0%;
    height: 1px;
    background-color: white;
    will-change: width;
    transition: all 750ms var(--ease);
  }
  .mounted {
    // margin-left: 10%;
    width: 100%;
  }
</style>
