<script lang="ts">
  import { loading } from '$lib/stores/stores';
  import type { LoadingStore } from '$lib/types/types'; // assuming you've defined these types in this module
  import Text from './Text.svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  let loadedItems: LoadingStore;

  loading.subscribe((value: LoadingStore) => {
    loadedItems = value;
  });
</script>

<div class="loading">
  {#each Object.values(loadedItems) as { id, status, message, progress }}
    <div class="item">
      <div class="flex">
        <Text vertical delay={id} type="p" text={message} />
        <Text
          vertical
          text={progress + '%'}
          secondary={true}
          delay={id + 2}
          type="p"
        />
      </div>
      {#if status}
        <div
          in:fly={{
            delay: id + 2 * 125,
            duration: 350,
            x: 15,
            easing: quintOut,
          }}
          out:fly={{
            delay: 1 * 125,
            duration: 350,
            x: 15,
            easing: quintOut,
          }}
          class="indicator"
        />
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .flex {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    transition: 350ms all;
  }
  .item {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .indicator {
    right: -12px;
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--c-accent);
    animation: blink 350ms ease infinite;
  }

  @keyframes blink {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }

  .text {
    transition: 350ms all;
    opacity: 1;
    transform: translateY(-15px);
  }
  .status {
    opacity: 1;
    transform: translateY(0px);
  }
  .loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    width: fit-content;
    height: fit-content;
    top: 24px;
    left: 16px;
    border-radius: 6px;
    width: 224px;
    backdrop-filter: blur(0);
    background-color: rgba(255, 255, 255, 0);
    z-index: 100;
    max-width: calc(50vw - 32px);
  }
</style>
