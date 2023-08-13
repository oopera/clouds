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
  import Link from '$lib/components/Link.svelte';

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
  <Layout padding="m" horizontal justify="between" align="start" gap="2">
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
    <div class="indicators">
      <Starfield />
      <Earthfield />
    </div>
  </Layout>

  <Layout padding="m" horizontal justify="between" align="end">
    <Layout align="start" gap="0" fit>
      <Text tertiary text={'B.sc. Human Computer Interaction'} delay={10} />
      <Layout horizontal gap="1" justify="start">
        <Text secondary delay={11} text={'Frontend:'} />
        <Text vertical delay={15} text={'Sveltekit'} />
      </Layout>
      <Layout horizontal gap="1" justify="start">
        <Text secondary delay={12} text={'Backend:'} />
        <Text vertical delay={16} text={' Vercel Serverless'} />

        <Link href="https://lucaslichner.de">
          <Text tertiary vertical delay={19} text={'[go-grib2]'} /></Link
        >
      </Layout>
      <Layout horizontal gap="1" justify="start">
        <Text secondary delay={13} text={'Data:'} />
        <Text vertical delay={17} text={'nomads.ncep.noaa.gov'} />
        <Text vertical tertiary delay={20} text={'[0.25 hourly TCDC]'} />
      </Layout>
      <Layout horizontal gap="1" justify="start">
        <Text secondary delay={14} text={'Render:'} />
        <Text vertical delay={18} text={'Webgpu'} />
      </Layout>
      <Layout horizontal justify="start" gap="1">
        <Link href="https://lucaslichner.de">
          <Text accent vertical delay={21} text={'Lucas Lichner.'} /></Link
        >
        <Link href="https://github.com/oopera/clouds">
          <Text accent vertical delay={21} text={'GitHub.'} /></Link
        >
      </Layout>
    </Layout>
    <Layout align="end" gap="2" fit horizontal>
      <Layout align="end" gap="2" fit>
        <RadioButton
          delay={1}
          title="cloud_type"
          options={['cumulus', 'stratus', 'cirrus']}
        />
        <RangeInput title="rotation_speed" min={0} max={5} step={0.25} />
        <RangeInput delay={6} title="scale" min={0.05} max={10.0} step={0.5} />
      </Layout>

      <ZoomIndicator />
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
