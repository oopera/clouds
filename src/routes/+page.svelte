<script lang="ts">
  import Canvas from '$lib/components/GlobeCanvas.svelte';
  import RangeInput from '$lib/components/RangeInput.svelte';
  import '$lib/styles/style.scss';
  import Cursor from '$lib/components/Cursor.svelte';
  import ZoomIndicator from '$lib/components/ZoomIndicator.svelte';
  import Starfield from '$lib/components/Starfield.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import Earthfield from '$lib/components/Earthfield.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';
  import Layout from '$lib/components/Layout.svelte';
  import Text from '$lib/components/Text.svelte';
  import RadioButton from '$lib/components/RadioButton.svelte';

  inject({ mode: dev ? 'development' : 'production' });

  let tasks = [
    {
      a: '(improve)',
      b: 'Volumetric Cloud Rendering',
    },
    {
      a: '(improve)',
      b: 'Dynamic Light and shimmer',
    },
    {
      a: '',
      b: 'Cloud Dissapation animation',
    },
    {
      a: '',
      b: 'User Date Input',
    },
    {
      a: '♡＼(￣▽￣)／♡',
      b: 'Make it cuter',
    },
  ];
</script>

<svelte:head>
  <title>Clouds — WebGPU</title>
</svelte:head>

<Cursor />
<Logo />

<main class="main">
  <Layout padding="m" horizontal justify="between" align="start" gap="4">
    <Loading />
    <Layout short align="end" justify="end">
      {#each tasks as task, i}
        {#if task.a !== ''}
          <Layout align="end" horizontal justify="between">
            <Text text={task.a} secondary delay={i + i + 1} type="p" />
            <Text vertical delay={i + 1} text={task.b} />
          </Layout>
        {:else}
          <Text vertical delay={i + 2} text={task.b} />
        {/if}
      {/each}
    </Layout>
  </Layout>

  <Layout padding="m" horizontal justify="between">
    <ZoomIndicator />
    <div class="indicators">
      <Starfield />
      <Earthfield />
    </div>
  </Layout>

  <Layout padding="m" horizontal justify="between" align="end">
    <Layout align="start" gap="0" fit>
      <Text secondary vertical text={'BSC BSC BSC BSC'} delay={10} />
      <Text
        vertical
        delay={11}
        text={'Custom Webgpu Engine + nomads.ncep.noaa'}
      />
      <Text
        vertical
        delay={12}
        text={'Sveltekit + Vercel Serverless Go Function'}
      />
      <a data-interactable target="_blank" href="https://lucaslichner.de">
        <Text vertical delay={14} text={'Lucas Lichner'} /></a
      >
    </Layout>
    <Layout align="end" gap="2">
      <RadioButton
        delay={1}
        title="cloud_type"
        options={['cumulus', 'stratus', 'cirrus']}
      />
      <RangeInput title="rotation_speed" min={0} max={5} step={0.25} />
      <RangeInput delay={6} title="scale" min={0.05} max={10.0} step={0.1} />
    </Layout>
  </Layout>
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
    z-index: 1;
  }
  .indicators {
    position: absolute;
    display: flex;
    flex-direction: column;
    right: gap(2);
    top: 50%;
    transform: translateY(-50%);
    gap: gap(2);
  }
</style>
