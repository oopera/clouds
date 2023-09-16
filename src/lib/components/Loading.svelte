<script lang="ts">
  import { loading } from '$lib/stores/stores';
  import type { LoadingStore } from '$lib/types/types'; // assuming you've defined these types in this module
  import Text from './Text.svelte';
  import Layout from './Layout.svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import Tag from './Tag.svelte';
  import Button from './Button.svelte';
  import DateInput from './Date_Input.svelte';

  let loadedItems: LoadingStore;
  let mounted: boolean = false;
  loading.subscribe((value: LoadingStore) => {
    loadedItems = value;
  });

  let frameCount: number = 0;
  let lastTime: number = performance.now();
  let fps: number = 0;
  let deviceFailed: boolean = false;

  let showDownloads: boolean = true;

  onMount(() => {
    mounted = true;
    calculateFPS();
  });

  $: if ($loading.welcome.message === 'error') {
    deviceFailed = true;
  }

  $: if (!$loading.welcome.status) {
    showDownloads = false;
  }

  const calculateFPS = () => {
    let currentTime = performance.now();
    let deltaTime = currentTime - lastTime;

    frameCount++;

    if (deltaTime >= 50) {
      fps = Math.round((frameCount / deltaTime) * 1000);
      lastTime = currentTime;
      frameCount = 0;
    }

    if (mounted) {
      requestAnimationFrame(calculateFPS);
    }
  };

  const onclick = () => {
    console.log(showDownloads);
    showDownloads = !showDownloads;
  };
</script>

<div class="loading">
  <Layout short align="start" gap="2">
    <Layout horizontal justify="between" gap="4">
      <Text nowrap vertical text={fps.toString()} />
      <Tag red={deviceFailed}>
        <Text
          nowrap
          text={deviceFailed
            ? 'Systems Not Operational'
            : 'All Systems Operational'}
        />
        <span class="y" class:deviceFailed data-indicator />
      </Tag>
    </Layout>
    <Layout short align="start" gap="2">
      <Layout horizontal short align="start" gap="2">
        <Button {onclick}
          ><Text secondary text={showDownloads ? 'hide' : 'show'} /></Button
        >
        <DateInput />
      </Layout>
      {#if showDownloads}
        <Layout short align="start">
          {#each Object.values(loadedItems) as { id, status, message, progress }}
            {#if id !== 0 && !deviceFailed}
              <Layout horizontal align="center" justify="start" gap="2">
                <Layout horizontal align="start" justify="between" gap="2">
                  <Text vertical delay={id} text={message} />
                  <Text
                    vertical
                    nowrap
                    text={progress + '%'}
                    secondary={progress !== 100}
                    tertiary={progress === 100}
                    delay={id + 1}
                  />
                </Layout>
                {#if status && mounted}
                  <span
                    data-indicator
                    class="indicator"
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
                  />
                {/if}
              </Layout>
            {/if}
          {/each}
        </Layout>
      {/if}
    </Layout>
  </Layout>
</div>

<style lang="scss">
  @import '$lib/styles/mixins.scss';

  .loading {
    top: 0;
    position: absolute;
  }
  .indicator {
    background-color: var(--c-accent);
  }
  .y {
    background-color: var(--c-g);
  }
  .deviceFailed {
    background-color: var(--c-secondary);
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
