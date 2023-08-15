<script lang="ts">
  import { onMount } from 'svelte';

  import Text from './Text.svelte';
  import Layout from './Layout.svelte';
  export let title:
    | 'use_texture'
    | 'theme'
    | 'mb300'
    | 'mb500'
    | 'mb700'
    | 'atmo';
  export let id: string = '';
  export let delay: number = 1;

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
    store.set((e.target as HTMLInputElement).checked);
  };
</script>

<Layout gap="1">
  <input
    data-interactable
    class="checkbox"
    checked={$store}
    type="checkbox"
    {title}
    {id}
    on:input={handleInput}
  />

  <Text secondary={!$store} vertical {delay} text={title} nowrap />
</Layout>

<style>
  .checkbox {
    position: relative;
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
    font: inherit;
    width: 24px;
    height: 24px;
    max-width: 24px;
    max-height: 24px;
    aspect-ratio: 1/1;
    border-radius: 50px;
    background: radial-gradient(
      circle,
      rgb(11, 17, 26) 0%,
      rgb(16, 21, 24) 30%,
      rgba(0, 0, 0) 100%
    );
    background-color: rgb(16, 21, 24);
    display: grid;
    place-content: center;
    border: 1pt solid var(--c-g);
  }

  .checkbox::before {
    transition: 350ms all;
    content: '';
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
  .checkbox::after {
    transition: 350ms all;
    content: '';
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

  .checkbox:checked::before {
    width: 22px;
    height: 22px;
    border-radius: 24px;
  }

  .checkbox:checked::after {
    width: 22px;
    height: 22px;
    border-radius: 40px;
    border: 1pt solid white;
    background: radial-gradient(
      circle,
      rgb(225, 225, 225) 0%,
      rgb(0, 34, 76) 30%,
      rgba(11, 17, 17, 0) 100%
    );
  }
</style>
