<script lang="ts">
  import '$lib/styles/style.scss';
  // import { dev } from '$app/environment';
  // import { inject } from '@vercel/analytics';

  import Canvas from '$lib/components/Canvas.svelte';
  import Range_Input from '$lib/components/Range.svelte';
  // import Cursor from '$lib/components/Cursor.svelte';
  import AxisIndicator from '$lib/components/Axis_Indicator.svelte';
  import Card from '$lib/components/Card.svelte';
  import Layout from '$lib/components/Layout.svelte';
  import Link from '$lib/components/Link.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import Text from '$lib/components/Text.svelte';

  // inject({ mode: dev ? 'development' : 'production' });
</script>

<svelte:head>
  <title>Clouds — WebGPU</title>
  <meta
    name="description"
    content="Clouds is a realtime 3D visualization of global cloud cover."
  />
</svelte:head>

<!-- <Cursor /> -->

<Canvas />
<main>
  <Layout horizontal align="start" justify="between" gap="6" stretch flex>
    <Loading />
    <span />
    <Logo />
  </Layout>
  <AxisIndicator />

  <Layout horizontal justify="between" align="end" gap="0" stretch>
    <div class="links">
      <Layout align="start" gap="0" fit>
        <Text type="h1" text={'LINKS'} delay={10} />
        <Text tertiary text={'B.sc. Human Computer Interaction'} delay={10} />
        <Layout horizontal justify="start">
          <Text nowrap secondary delay={10} text={'Frontend:'} />
          <Text delay={10} text={'Sveltekit'} />
        </Layout>
        <Layout horizontal justify="start">
          <Text nowrap secondary delay={10} text={'Backend:'} />
          <Text delay={10} text={'Vercel Serverless'} />

          <Link href="https://github.com/amsokol/go-grib2">
            <Text tertiary delay={10} text={'[go-grib2]'} /></Link
          >
        </Layout>
        <Layout horizontal justify="start">
          <Text nowrap secondary delay={10} text={'Data:'} />
          <Text delay={10} text={'nomads.ncep.noaa.gov'} />

          <Link href="https://nomads.ncep.noaa.gov/gribfilter.php?ds=gdas_0p25">
            <Text tertiary delay={10} text={'[0.25 hourly TCDC]'} /></Link
          >
        </Layout>
        <Layout horizontal justify="start">
          <Text nowrap secondary delay={5} text={'Render:'} />
          <Text delay={10} text={'Webgpu'} />
        </Layout>
        <Layout horizontal justify="start">
          <Link href="https://lucaslichner.de">
            <Text nowrap accent delay={10} text={'Lucas Lichner.'} /></Link
          >
          <Link href="https://github.com/oopera/clouds">
            <Text nowrap accent delay={10} text={'GitHub.'} /></Link
          >
        </Layout>
      </Layout>
    </div>
    <Card show side="right">
      <div class="inputs">
        <Layout gap="1" align="end">
          <Range_Input
            delay={0}
            title="cloud_density"
            min={0}
            max={1.0}
            step={0.015}
          />
          <Range_Input
            delay={0}
            title="step_length"
            min={0.001}
            max={0.025}
            step={0.001}
          />
          <Text accent delay={9} text={'FORM'} />
        </Layout>
        <Layout gap="1" align="end">
          <Range_Input
            delay={0}
            title="light_intensity"
            min={0}
            max={1.0}
            step={0.01}
          />
          <Range_Input
            delay={0}
            title="atmo_intensity"
            min={0}
            max={1.0}
            step={0.01}
          />
          <Text accent delay={9} text={'LIGHT'} />
        </Layout>
        <Layout gap="1" align="end">
          <Range_Input
            delay={0}
            title="rotation_speed"
            min={0}
            max={1}
            step={0.05}
          />
          <Range_Input
            delay={0}
            title="tweenedZoom"
            min={21}
            max={35}
            step={1}
          />
          <Text accent delay={9} text={'CAMERA'} />
        </Layout>
      </div>
    </Card>
  </Layout>
</main>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  main {
    overflow: hidden;
    position: relative;
    height: 100vh;
    max-height: 100vh;
    display: flex;
    padding: 15px;
    box-sizing: border-box;
  }
  .links {
  }

  .inputs {
    display: none;
    flex-direction: column;
    gap: gap(1);
    align-items: flex-end;
    justify-content: flex-start;
    // flex-wrap: wrap-reverse;
    width: fit-content;
    @include m {
      display: flex;
    }

    @media (max-height: 850px) {
      // display: none;
      flex-direction: row;
    }
  }
</style>
