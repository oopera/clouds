<div class={'container'}>
  <div class="container-inner">
    <slot />
  </div>
</div>

<style>
  .container {
    height: fit-content;
    width: fit-content;

    pointer-events: all;
    z-index: 1;
    position: relative;
    max-width: 100vw;
    border-radius: 15px;
    transition: 350ms ease all;
    @media (max-width: 768px) {
      display: none;
    }
  }
  .container-inner {
    max-width: fit-content;
    height: 100%;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
    justify-content: center;
    flex-wrap: wrap;
    & > * {
      flex: 1;
    }
  }
</style>
