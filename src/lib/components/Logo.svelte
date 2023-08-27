<script lang="ts">
  import { loading } from '$lib/stores/stores';
  import { onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import Text from './Text.svelte';
  import Layout from './Layout.svelte';

  let mounted = false;
  let loaded = false;
  let deviceFailed = false;

  onMount(() => {
    mounted = true;
  });

  $: if (!$loading.welcome.status) {
    loaded = true;
  }

  $: if ($loading.welcome.message === 'oh-oh') {
    deviceFailed = true;
  }
</script>

{#if mounted && !deviceFailed && !loaded}
  <span class="parent">
    <span
      in:fly={{
        delay: 4 * 125,
        duration: 350,
        y: 15,
        easing: quintOut,
      }}
      out:fly={{
        delay: 2 * 125,
        duration: 350,
        y: -15,
        easing: quintOut,
      }}
      class:loaded
      class="letter">C</span
    >
    <span
      in:fly={{
        delay: 1.5 * 125,
        duration: 350,
        y: -15,
        easing: quintOut,
      }}
      out:fly={{
        delay: 3.0 * 125,
        duration: 350,
        y: 15,
        easing: quintOut,
      }}
      class:loaded
      class="letter">L</span
    >
    <span
      in:fly={{
        delay: 0.5 * 125,
        duration: 350,
        y: 15,
        easing: quintOut,
      }}
      out:fly={{
        delay: 1.0 * 125,
        duration: 350,
        y: -15,
        easing: quintOut,
      }}
      class:loaded
      class="letter">O</span
    >
    <span
      in:fly={{
        delay: 3 * 125,
        duration: 350,
        y: -15,
        easing: quintOut,
      }}
      out:fly={{
        delay: 6 * 125,
        duration: 350,
        y: 15,
        easing: quintOut,
      }}
      class:loaded
      class="letter">U</span
    >
    <span
      in:fly={{
        delay: 1 * 125,
        duration: 350,
        y: 15,
        easing: quintOut,
      }}
      out:fly={{
        delay: 2 * 125,
        duration: 350,
        y: -15,
        easing: quintOut,
      }}
      class:loaded
      class="letter">D</span
    >
    <span
      in:fly={{
        delay: 2 * 125,
        duration: 350,
        y: -15,
        easing: quintOut,
      }}
      out:fly={{
        delay: 4 * 125,
        duration: 350,
        y: 15,
        easing: quintOut,
      }}
      class:loaded
      class="letter">S</span
    >

    <div class="crosshair">
      <div
        class:loaded_hor={mounted && !loaded}
        class="crosshair__horizontal"
      />
      <div class:loaded_ver={mounted && !loaded} class="crosshair__vertical" />
    </div>
    {#if mounted && !loaded}
      <span class="loading">
        <Text vertical delay={4} secondary={true} text={'loading'} />
      </span>
    {/if}
  </span>
{/if}

{#if deviceFailed}
  <span class="error">
    <Layout>
      <Text vertical delay={4} text={'Attaching to GPU Failed.'} />
      <Text
        vertical
        tertiary
        delay={4}
        text={'You need to use Chrome 113 onwards.'}
      />
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
  }
  .crosshair {
    height: 28px;
    width: 28px;
    position: absolute;
    animation: rotate 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
    transform-origin: center;
    top: 50%;
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
    top: 50%;
    transform: translate(calc(-50% - 32px), calc(-50% - 8px));
  }

  .parent {
    position: absolute;
    left: 50%;
    height: 100vh;
    transform: translateX(-50%);
    @media (max-width: 768px) {
      left: 50%;
      transform: translateX(calc(-50%));
    }
  }

  .letter {
    display: inline-block;
    position: relative;
    height: fit-content;
    width: fit-content;
    top: 50%;
    transition: 350ms var(--ease);
    transform: translateY(-50%);
    font-family: 'Cirka';
    font-size: 36px;
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
