<script lang="ts">
  export let horizontal: boolean = false;
  export let gap: '0' | '1' | '2' | '4' | '6' | '8' | '10' = '0';
  export let align: 'start' | 'center' | 'end' = 'center';
  export let justify: 'start' | 'center' | 'end' | 'between' = 'center';
  export let padding: '0' | 's' | 'm' | 'l' = '0';
  export let short: boolean = false;
  export let fit: boolean = false;
  export let marginTop: boolean = false;
  export let stretch: boolean = false;
  export let swap: boolean = false;
  export let card: boolean = false;
</script>

<div
  class="gap-{gap} align-{align} justify-{justify} pad-{padding}"
  class:horizontal
  class:short
  class:fit
  class:margin-top={marginTop}
  class:stretch
  class:swap
  class:card
>
  <slot />
</div>

<style lang="scss">
  @import '$lib/styles/mixins.scss';

  div {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    pointer-events: none;
  }

  .margin-top {
    margin-top: auto;
  }

  .fit {
    width: fit-content;
  }

  .short {
    max-width: 256px;
  }

  .swap {
    flex-direction: column;
    @include m {
      flex-direction: row;
    }
  }

  .stretch {
    align-self: stretch;
    flex: 2;
  }

  .pad-0 {
    padding: 0;
  }

  .pad-s {
    padding: gap(1);
  }

  .pad-m {
    padding: gap(2);
  }

  .pad-l {
    padding: gap(3);
  }

  .horizontal {
    flex-direction: row;
  }
  .align-start {
    align-items: flex-start;
  }
  .align-center {
    align-items: center;
  }
  .align-end {
    align-items: flex-end;
  }
  .justify-start {
    justify-content: flex-start;
  }
  .justify-center {
    justify-content: center;
  }
  .justify-end {
    justify-content: flex-end;
  }
  .justify-between {
    justify-content: space-between;
  }
  .gap-0 {
    gap: 0;
  }
  .gap-1 {
    gap: gap(1);
  }
  .gap-2 {
    gap: gap(2);
  }
  .gap-4 {
    gap: gap(4);
  }
  .gap-6 {
    gap: gap(6);
  }
  .gap-8 {
    gap: gap(8);
  }
  .gap-10 {
    gap: gap(10);
  }
</style>
