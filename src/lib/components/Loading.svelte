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
  import Line from './Line.svelte';

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
    setTimeout(() => {
      mounted = true;
    }, 1);
    calculateFPS();
  });

  $: if ($loading.welcome.message === 'error') {
    deviceFailed = true;
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

<div class="loading" class:mounted>
  <Layout align="start" gap="2">
    <Layout horizontal justify="between" gap="4">
      <p>{fps.toString()}</p>
      <Tag red={deviceFailed}>
        <p>
          {deviceFailed ? 'Systems Not Operational' : 'All Systems Operational'}
        </p>
        <span class="y" class:deviceFailed data-indicator />
      </Tag>
    </Layout>

    <Layout align="start" justify="between" gap="2">
      <Layout horizontal align="start" gap="2" justify="between">
        <Button {onclick}><p>{showDownloads ? 'hide' : 'show'}</p></Button>
        <DateInput />
      </Layout>
      {#if showDownloads}
        <Line />
        <Layout align="start">
          {#each Object.values(loadedItems) as { id, status, message, progress }}
            {#if id !== 0}
              <Layout horizontal align="center" justify="start" gap="2">
                <Layout horizontal align="start" justify="between" gap="2">
                  <Text delay={id} text={message} />
                  <Text
                    nowrap
                    text={progress + '%'}
                    secondary={progress !== 100}
                    tertiary={progress === 100}
                    delay={id + 1}
                  />
                </Layout>
                {#if status && mounted}
                  <span data-indicator class="indicator" />
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
    width: 100%;
    transition: transform 0.75s var(--ease);
    transform: translateY(-100%);
    @include s {
      width: 300px;
      max-width: 100%;
    }
  }
  .mounted {
    transform: translateY(0);
  }

  .indicator {
    position: absolute;
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
