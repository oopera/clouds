<script lang="ts">
  import { loading } from '$lib/stores/stores';
  import type { LoadingStore } from '$lib/types/types'; // assuming you've defined these types in this module
  import Text from './Text.svelte';
  import Layout from './Layout.svelte';
  import { onMount } from 'svelte';
  import Tag from './Tag.svelte';
  import Button from './Button.svelte';
  import Line from './Line.svelte';
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
    calculateFPS();
    setTimeout(() => {
      mounted = true;
    }, 1);
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

    requestAnimationFrame(calculateFPS);
  };

  const onclick = () => {
    showDownloads = !showDownloads;
  };
</script>

<div class="loading" class:mounted>
  <Layout align="start" gap="2">
    <Layout align="start" justify="between" gap="2">
      <Layout horizontal align="center" gap="2" justify="between">
        <Button {onclick}><p>{showDownloads ? 'hide' : 'show'}</p></Button>
        <DateInput />
        <p>{fps.toString()}</p>
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

    transition: transform 0.75s var(--ease);
    transform: translateY(-100%);

    width: 300px;
    max-width: 100%;
  }
  .mounted {
    transform: translateY(0);
  }

  .indicator {
    position: absolute;
    background-color: var(--c-accent);
  }
</style>
