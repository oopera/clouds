<script lang="ts">
  import { onMount } from 'svelte';
  import type { Stores } from '$lib/types/types';
  import IconComponent from './Icon.svelte';
  import Tooltip from './Tooltip.svelte';

  export let title: Stores;
  export let off_title: string = '';
  export let third_title: string = '';
  export let three: boolean = false;

  let store: any;
  let mounted: boolean = false;

  onMount(async () => {
    mounted = true;
    store = await import(`./../stores/stores.js`).then(
      (m) => m[title as keyof typeof m]
    );
    if (!store) return;
  });

  const handleInputCheckbox = (e: Event) => {
    if (!store) return;
    store.set(!$store);
  };

  const handleInputText = (e: Event) => {
    if (!store) return;
    store.set(
      $store === title ? off_title : $store === off_title ? third_title : title
    );
  };
</script>

<button
  on:click={three ? handleInputText : handleInputCheckbox}
  data-interactable
>
  {#if three}
    <Tooltip text={$store}>
      <IconComponent type={$store} />
    </Tooltip>
  {:else}
    <Tooltip text={$store ? title : off_title}>
      <IconComponent type={$store ? title : off_title} />
    </Tooltip>
  {/if}
</button>

<style lang="scss">
  button {
    display: flex;
    align-items: end;
    justify-content: end;
    flex-direction: column;

    z-index: 1;
    cursor: pointer;
    &:focus-visible {
      outline: 1px solid white;
    }
  }
</style>
