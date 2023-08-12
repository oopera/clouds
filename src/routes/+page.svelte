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

  inject({ mode: dev ? 'development' : 'production' });
</script>

<svelte:head>
  <title>Clouds — WebGPU</title>
</svelte:head>

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
      <RangeInput delay={6} title="scale" min={0.05} max={10.0} step={0.1} />
    </Container>
  </div>
</main>

<Canvas />

<style lang="scss">
  @import '$lib/styles/mixins.scss';
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
    right: gap(2);
    top: 50%;
    transform: translateY(-50%);
    gap: gap(4);
  }
  .flex {
    position: relative;
    display: flex;
    flex-direction: row;
    box-sizing: border-box;
    width: 100%;
    height: fit-content;
    justify-content: space-between;
    padding: gap(3) gap(2);
    gap: gap(2);
  }
  .align-end {
    align-items: flex-end;
  }
</style>
