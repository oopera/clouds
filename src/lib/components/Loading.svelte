<script lang="ts">
  import { loading } from '$lib/stores/stores';
  import type { LoadingStore } from '$lib/types/types'; // assuming you've defined these types in this module
  import Text from './Text.svelte';
  import Layout from './Layout.svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  let loadedItems: LoadingStore;

  loading.subscribe((value: LoadingStore) => {
    loadedItems = value;
  });
</script>

<Layout short align="start">
  {#each Object.values(loadedItems) as { id, status, message, progress }}
    <Layout horizontal align="center" justify="start" gap="2">
      <Layout horizontal align="start" justify="between" gap="2">
        <Text vertical delay={id} type="p" text={message} />
        <Text
          vertical
          text={progress + '%'}
          secondary={progress !== 100}
          tertiary={progress === 100}
          delay={id + 1}
          type="p"
        />
      </Layout>
      {#if status}
        <div
          in:fly={{
            delay: id + 2 * 125,
            duration: 350,
            x: 15,
            easing: quintOut,
          }}
          out:fly={{
            delay: id + 2 * 125,
            duration: 350,
            x: 15,
            easing: quintOut,
          }}
          class="indicator"
        />
      {/if}
    </Layout>
  {/each}
</Layout>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  .indicator {
    right: calc(gap(1) * -1);
    position: absolute;
    width: gap(0.5);
    height: gap(0.5);
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
</style>
