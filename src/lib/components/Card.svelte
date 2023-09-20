<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './Button.svelte';
  import { loading } from '$lib/stores/stores';
  import type { LoadingStore } from '$lib/types/types';

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
    inview = true;
  }

  onMount(() => {
    setTimeout(() => {
      mounted = true;
    }, 1);
  });
</script>

<div class="wrapper" class:inview class:mounted>
  <Button {onclick}>
    <p>{inview ? 'hide' : 'show'}</p>
  </Button>
  <div class="card">
    <slot />
  </div>
</div>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  .wrapper {
    display: flex;
    flex-direction: column;
    align-items: end;
    gap: gap(2);
    transition: transform 0.75s var(--ease), opacity 0.75s var(--ease);
    transform: translateY(calc(100%));
    z-index: 1;
  }
  .mounted {
    transform: translateY(calc(100% - 25px));
  }
  .card {
    // padding: 24px;
    backdrop-filter: blur(16px);
    overflow: hidden;
    * {
      pointer-events: none;
    }
  }
  .inview {
    transform: translateY(0);
  }
</style>
