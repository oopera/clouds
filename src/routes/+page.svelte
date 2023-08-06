<script lang="ts">
  import Canvas from '$lib/components/GlobeCanvas.svelte';
  import Container from '$lib/components/Container.svelte';
  import RangeInput from '$lib/components/RangeInput.svelte';
  import '$lib/styles/style.scss';
  import Cursor from '$lib/components/Cursor.svelte';
  import ZoomIndicator from '$lib/components/ZoomIndicator.svelte';
  import Starfield from '$lib/components/Starfield.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import Earthfield from '$lib/components/Earthfield.svelte';
  import Tasks from '$lib/components/Tasks.svelte';
  import { onMount } from 'svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';
  import Text from '$lib/components/Text.svelte';

  inject({ mode: dev ? 'development' : 'production' });

  onMount(() => {
    window.onmousedown = (e) => {
      if (e.buttons === 4 || e.buttons === 2) {
        e.preventDefault();
        return false;
      }
    };
  });
</script>

<svelte:head>
  <title>Clouds — WebGPU</title>
</svelte:head>

<Canvas />
<Cursor />
<Logo />

<main class="main">
  <div class="flex">
    <Loading />
    <Tasks />
  </div>

  <div class="flex">
    <ZoomIndicator />
    <div class="indicators">
      <Starfield />
      <Earthfield />
    </div>
  </div>

  <div class="flex align-end">
    <Footer />
    <Container>
      <RangeInput title="rotation_speed" min={0} max={5} step={0.25} />
      <RangeInput
        delay={5}
        title="displacement"
        min={-0.05}
        max={0.05}
        step={0.0005}
      />
    </Container>
  </div>
</main>

<style lang="scss">
  @use '$lib/styles/mixins.scss';
  .main {
    overflow: hidden;
    position: relative;
    display: flex;
    height: 100vh;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
  }
  .indicators {
    position: absolute;
    display: flex;
    flex-direction: column;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    gap: 32px;
  }
  .flex {
    position: relative;
    display: flex;
    flex-direction: row;
    box-sizing: border-box;
    width: 100%;
    height: fit-content;
    justify-content: space-between;
    padding: 24px 16px;
    gap: 16px;
  }
  .align-end {
    align-items: flex-end;
  }
</style>
