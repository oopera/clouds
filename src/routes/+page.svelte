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
</script>

<svelte:head>
  <title>Clouds — WebGPU</title>
</svelte:head>

<Cursor />
<Logo />

<main class="main">
  <Layout padding="m" horizontal justify="between" align="start" gap="2">
    <Loading />
    <Layout align="end" gap="0" fit>
      <Text tertiary text={'Current Todos'} delay={10} />
      <Layout horizontal gap="1" justify="between">
        <Text secondary delay={6} text={'Improve'} />
        <Text vertical delay={1} text={'Volumetric Cloud Rendering'} />
      </Layout>
      <Layout horizontal gap="1" justify="between">
        <Text secondary delay={7} text={'Improve'} />
        <Text vertical delay={2} text={' Dynamic Light and shimmer'} />
      </Layout>

      <Layout horizontal gap="1" justify="between">
        <Text secondary delay={8} text={'add'} />
        <Text vertical delay={3} text={' Cloud Dissapation animation'} />
      </Layout>
      <Layout horizontal gap="1" justify="between">
        <Text secondary delay={9} text={'add'} />
        <Text vertical delay={4} text={'User Date Input'} />
      </Layout>
      <Layout horizontal gap="1" justify="between">
        <Text secondary delay={10} text={'♡＼(￣▽￣)／♡'} />
        <Text vertical delay={5} text={'Make it cuter'} />
      </Layout>
    </Layout>
  </Layout>

  <Layout padding="m" horizontal justify="between">
    <Starfield />
    <Earthfield />
  </Layout>

  <Layout padding="m" horizontal justify="between" align="end" gap="2">
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
        <RangeInput delay={6} title="scale" min={0.05} max={2.0} step={0.05} />
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
