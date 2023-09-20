<script lang="ts">
  import { loading } from '$lib/stores/stores';
  import { onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import Text from './Text.svelte';
  import Layout from './Layout.svelte';
  import Line from './Line.svelte';
  import Tag from './Tag.svelte';
  import Button from './Button.svelte';

  let mounted = false;
  let loaded = false;
  let deviceFailed = false;

  onMount(() => {
    setTimeout(() => {
      mounted = true;
    }, 1);
  });

  $: if (!$loading.welcome.status) {
    loaded = true;
  }

  $: if ($loading.welcome.message === 'error') {
    deviceFailed = true;
  }
</script>

<div class="slider" class:mounted />

{#if mounted && !deviceFailed}
  <span class="parent" class:loaded>
    <Text type="h1" delay={4} secondary={true} text={'CLOUDS'} />
    {#if mounted && loaded}
      <span class="text">
        <Layout gap="1" align="end">
          <Text
            delay={4}
            secondary={true}
            text={'Clouds is a WEBGPU application to render meteorologically accurate cloud cover'}
          />
          <Line />
        </Layout>
      </span>
    {/if}
    {#if mounted && !loaded}
      <span class="loading">
        <Text delay={4} secondary={true} text={'loading'} />
      </span>
    {/if}
  </span>
{/if}

{#if deviceFailed}
  <span class="error">
    <Layout>
      <Text nowrap delay={0} text={'Attaching to GPU Failed.'} />
      <Text tertiary delay={6} text={'You need to use Chrome 113 onwards.'} />
    </Layout>
  </span>
{/if}

<style lang="scss">
  @import '$lib/styles/mixins.scss';

  .error {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 1px solid var(--c-accent);
    padding: 12px;
    animation: blink 0.15s var(--ease) 6 alternate;
  }

  @keyframes blink {
    0% {
      border: 1px solid var(--c-accent);
    }
    50% {
      border: 0;
    }
    100% {
      border: 1px solid var(--c-accent);
    }
  }

  .crosshair {
    height: 28px;
    width: 28px;
    position: absolute;
    animation: rotate 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
    transform-origin: center;
    top: 50%;
  }
  .text {
    max-width: 152px;
  }
  @keyframes rotate {
    0% {
      rotate: 0deg;
    }
    100% {
      rotate: 360deg;
    }
  }

  @keyframes elongateHeight {
    0% {
      height: 32px;
      background: var(--star-gradient);
    }
    50% {
      height: 64px;
      background: var(--star-gradient);
    }
    100% {
      height: 32px;
      background: var(--star-gradient);
    }
  }
  @keyframes elongateWidth {
    0% {
      width: 32px;
      background: var(--star-gradient);
    }
    50% {
      width: 64px;
      background: var(--star-gradient);
    }
    100% {
      width: 32px;
      background: var(--star-gradient);
    }
  }

  .crosshair__horizontal {
    width: 0px;
    height: 1px;
    background: var(--star-gradient);
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 0;
    transform: translate(calc(-50%), calc(-50%));
    transition: all 350ms var(--ease);
  }
  .crosshair__vertical {
    width: 1px;
    height: 0px;
    background: var(--star-gradient);
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 0;
    transform: translate(calc(-50%), calc(-50%));
    transition: all 350ms var(--ease);
  }

  .loaded_hor {
    width: 28px;
    animation: elongateWidth 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)
      infinite;
  }
  .loaded_ver {
    height: 28px;
    animation: elongateHeight 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)
      infinite;
  }
  .loading {
    display: inline-block;
    position: relative;
    height: fit-content;
    width: fit-content;
  }

  .parent {
    position: absolute;
    display: flex;
    flex-direction: column;
    padding: 8px;
    top: 50%;
    right: 50%;
    transform: translate(50%, -50%);
    transition: 350ms var(--ease);
    z-index: 1;
  }

  .loaded {
    opacity: 0;
    top: 0;
    @include s {
      opacity: 1;
      top: 0;
      right: 0;
      transform: translate(0%, 0%);
    }
  }

  .letter {
    transition: 350ms var(--ease);
    font-family: 'Pier';
    font-size: clamp(24px, 5vw, 48px);
    font-weight: 900;
    letter-spacing: -4px;
  }

  .letter:nth-child(1) {
    transition-delay: 0.4s;
    transition-duration: 0.5s;
  }

  .letter:nth-child(2) {
    transition-delay: 0.1s;
    transition-duration: 0.6s;
  }

  .letter:nth-child(3) {
    transition-delay: 0.2s;
    transition-duration: 0.7s;
  }

  .letter:nth-child(4) {
    transition-delay: 0.3s;
    transition-duration: 0.9s;
  }

  .letter:nth-child(5) {
    transition-delay: 0.2s;
    transition-duration: 0.7s;
  }

  .letter:nth-child(6) {
    transition-delay: 0.5s;
    transition-duration: 1.14s;
  }
</style>
