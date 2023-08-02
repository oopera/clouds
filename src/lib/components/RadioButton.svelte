<script lang="ts">
  import { onMount } from 'svelte';
  import Text from './Text.svelte';
  export let title: 'topology';
  export let options: string[] = [];
  export let value: string = '';
  export let delay: number = 1;
  let store: any;

  onMount(async () => {
    store = await import(`./../stores/stores.js`).then((m) => m[title]);

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

<div class="range-input-container">
  {#each options as option, i}
    <div class="radio-container">
      <input
        data-interactable
        id={option}
        title={option}
        value={option}
        checked={value === option}
        on:input={handleInput}
        type="radio"
        class="radio"
      />

      <Text delay={delay + i}>{option}</Text>
    </div>
  {/each}
</div>

<style>
  .radio-container {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }

  .range-input-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-width: 128px;
  }

  .radio {
    height: 24px;
    width: 24px;
    background: radial-gradient(
      circle,
      rgb(11, 17, 26) 0%,
      rgb(16, 21, 24) 30%,
      rgba(0, 0, 0) 100%
    );
    background: rgb(8, 9, 15);
    accent-color: rgb(55, 120, 240);
    margin: 0;
    border-radius: 25px;
    appearance: none;
    position: relative;
    border: 1pt solid var(--c-g);
  }
  .radio::before {
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
  .radio::after {
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

  .radio:checked::before {
    width: 16px;
    height: 16px;
  }

  .radio:checked::after {
    width: 20px;
    height: 20px;
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
