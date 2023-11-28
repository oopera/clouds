<script lang="ts">
  import { onMount } from 'svelte';
  import Text from './Text.svelte';
  import type { Stores } from '$lib/types/types';
  import Layout from './Layout.svelte';
  export let title: Stores;
  export let options: string[] = [];
  export let value: string = '';
  export let delay: number = 1;
  let store: any;

  onMount(async () => {
    store = await import(`../stores/stores.js`).then((m) => m[title]);

    if (!store) return;
    store.subscribe((v: string) => {
      value = v;
    });
  });

  const handleInput = (e: Event) => {
    if (!store) return;
    value = (e.target as HTMLInputElement).value;
    store.set((e.target as HTMLInputElement).value);
  };
</script>

<div>
  <Layout fit align="center" justify="between" gap="0">
    {#each options as text, i}
      <Layout horizontal align="center" justify="between" gap="2">
        <input
          data-interactable
          id={text}
          title={text}
          value={text}
          checked={value === text}
          on:input={handleInput}
          type="radio"
          class="radio"
        /
        
        >
        <Text nowrap tertiary={value === text} delay={delay + i} {text} />
      </Layout>
    {/each}
  </Layout>
</div>

<style>
  input {
    height: 24px;
    width: 24px;
    background: var(--dark-gradient);
    background: rgb(8, 9, 15);
    accent-color: rgb(55, 120, 240);
    margin: 0;
    border-radius: 25px;
    appearance: none;
    position: relative;
    border: 1pt solid var(--c-g);
  }
  input::before {
    transition: 350ms all;
    content: '';
    width: 1px;
    height: 80%;
    background: var(--star-gradient);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  input::after {
    transition: 350ms all;
    content: '';
    width: 80%;
    height: 1px;
    background: var(--star-gradient);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  input:checked::before {
    width: 16px;
    height: 16px;
  }

  input:checked::after {
    width: 20px;
    height: 20px;
    border-radius: 40px;
    border: 1pt solid white;
    background: var(--blue-gradient);
  }
</style>
