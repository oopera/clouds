<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './Button.svelte';
  import { loading } from '$lib/stores/stores';
  import type { LoadingStore } from '$lib/types/types';

  export let show: boolean | null;
  export let direction: 'left' | 'down' = 'down';
  export let side: 'left' | 'right' = 'right';
  export let viewport: 's' | 'm' | 'l' = 's';

  let loadedItems: LoadingStore;
  loading.subscribe((value: LoadingStore) => {
    loadedItems = value;
  });
  let inview: boolean = false;
  let mounted: boolean = false;

  const onclick = () => {
    inview = !inview;
  };

  $: if ($loading.welcome.status) {
    inview = false;
  } else {
    if (show) {
      inview = true;
    }
  }

  onMount(() => {
    setTimeout(() => {
      mounted = true;
    }, 250);
  });
</script>

<div
  class="wrapper {side} {viewport}"
  class:inview
  class:mounted
  class:left={direction === 'left'}
>
  {#if !show}
    <Button {onclick}>
      <p>{inview ? 'hide' : 'show'}</p>
    </Button>
  {/if}
  <div class={side === 'right' ? 'blur' : ''}>
    <slot />
  </div>
</div>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  .wrapper {
    display: flex;
    flex-direction: column;
    align-items: end;
    width: fit-content;
    gap: gap(2);
    transition: transform 0.75s var(--ease), opacity 0.75s var(--ease);
    transform: translateY(calc(120%));
    // position: absolute;
    bottom: 0;
    display: none;
    // position: absolute;
    left: 0;
    flex-wrap: wrap;
    border-radius: 8px;
    margin: 16px;
    height: 150px;
  }

  .blur {
    backdrop-filter: blur(24px);
    border-radius: 8px;
    padding: 8px;
  }

  .s {
    display: flex;
  }

  .m {
    @include m {
      display: flex;
    }
  }

  .right {
    left: unset;
    right: 0;
  }

  .right {
    flex-direction: row;
    transform: translateX(calc(100% - 80px));
  }
  .right .mounted {
    transform: translateX(calc(100% + 25px));
  }
  .inview {
    transform: translateY(0);
  }
</style>
