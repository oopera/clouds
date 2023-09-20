<script lang="ts">
  import { onMount } from 'svelte';
  import type { Stores } from '$lib/types/types';
  import IconComponent from './IconComponent.svelte';
  import Tooltip from './Tooltip.svelte';

  export let title: Stores;
  export let off_title: 'full_res' | 'no_atmo' = 'full_res';

  let store: any;
  let mounted: boolean = false;

  onMount(async () => {
    mounted = true;
    store = await import(`./../stores/stores.js`).then(
      (m) => m[title as keyof typeof m]
    );
    if (!store) return;
  });

  const handleInput = (e: Event) => {
    if (!store) return;
    store.set(!$store);
  };
</script>

<button on:click={handleInput} data-interactable>
  <Tooltip text={title}>
    <IconComponent type={$store ? title : off_title} />
  </Tooltip>
</button>

<style lang="scss">
  button {
    display: flex;
    align-items: end;
    justify-content: end;
    flex-direction: column;
    gap: 4px;
    z-index: 1;
    cursor: pointer;
  }
</style>
