<div class={'container'}>
  <div class="container-inner">
    <slot />
  </div>
</div>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  .container {
    height: fit-content;
    width: fit-content;

    pointer-events: all;
    z-index: 1;
    position: relative;
    max-width: 100vw;
    border-radius: 15px;
    transition: 350ms ease all;
    backdrop-filter: blur(24px);
    border: 1px solid var(--c-g);
    @media (max-width: 768px) {
      display: none;
    }
  }
  .container-inner {
    max-width: fit-content;
    height: 100%;
    padding: gap(2);
    display: flex;
    flex-direction: column;
    gap: gap(1);
    align-items: flex-end;
    justify-content: center;
    flex-wrap: wrap;
    & > * {
      flex: 1;
    }
  }
</style>
