<script lang="ts">
  import '$lib/styles/style.scss';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';

  import Canvas from '$lib/components/Canvas.svelte';
  import Range_Input from '$lib/components/Range_Input.svelte';
  import Cursor from '$lib/components/Cursor.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import Axis_Indicator from '$lib/components/Axis_Indicator.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import Layout from '$lib/components/Layout.svelte';
  import Text from '$lib/components/Text.svelte';
  import Radio_Button from '$lib/components/Radio_Button.svelte';
  import Link from '$lib/components/Link.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';

  inject({ mode: dev ? 'development' : 'production' });
</script>

<svelte:head>
  <title>Clouds — WebGPU</title>
  <meta
    name="description"
    content="Clouds is a realtime 3D visualization of global cloud cover."
  />
</svelte:head>

<Cursor />
<Logo />

<main>
  <Layout stretch padding="m" horizontal justify="between" align="end" gap="2">
    <Layout stretch align="start" justify="between" gap="6">
      <Loading />
      <Layout align="start" gap="0" fit>
        <Text tertiary text={'B.sc. Human Computer Interaction'} delay={1} />
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={2} text={'Frontend:'} />
          <Text delay={8} text={'Sveltekit'} />
        </Layout>
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={3} text={'Backend:'} />
          <Text delay={9} text={' Vercel Serverless'} />

          <Link href="https://github.com/amsokol/go-grib2">
            <Text tertiary delay={10} text={'[go-grib2]'} /></Link
          >
        </Layout>
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={4} text={'Data:'} />
          <Text delay={11} text={'nomads.ncep.noaa.gov'} />

          <Link href="https://nomads.ncep.noaa.gov/gribfilter.php?ds=gdas_0p25">
            <Text tertiary delay={12} text={'[0.25 hourly TCDC]'} /></Link
          >
        </Layout>
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={5} text={'Render:'} />
          <Text delay={6} text={'Webgpu'} />
        </Layout>
        <Layout horizontal justify="start" gap="1">
          <Link href="https://lucaslichner.de">
            <Text nowrap accent delay={6} text={'Lucas Lichner.'} /></Link
          >
          <Link href="https://github.com/oopera/clouds">
            <Text nowrap accent delay={7} text={'GitHub.'} /></Link
          >
        </Layout>
      </Layout>
    </Layout>
    <Axis_Indicator />
    <div class="desktop">
      <Card>
        <Layout align="end" gap="1" fit card>
          <Radio_Button
            delay={5}
            title="light_type"
            options={['day_cycle', 'full_day', 'full_night']}
          />

          <Checkbox delay={5} title="atmo" />
          <Checkbox delay={5} title="half_res" />

          <Button id="download">
            <Text secondary text={'download canvas'} />
          </Button>
        </Layout>
      </Card>

      <Card>
        <Layout align="end" gap="2" fit horizontal card>
          <Layout align="end" gap="1" fit>
            <Range_Input
              delay={0}
              title="cloud_density"
              min={0}
              max={2.0}
              step={0.1}
            />
            <Range_Input
              delay={0}
              title="raymarch_steps"
              min={1}
              max={299}
              step={5}
            />
            <Text accent delay={9} text={'FORM'} />

            <Range_Input
              delay={0}
              title="rayleigh_intensity"
              min={0}
              max={2.0}
              step={0.05}
            />
            <Range_Input
              delay={0}
              title="sun_transmittance"
              min={0}
              max={2.0}
              step={0.1}
            />
            <Text accent delay={9} text={'LIGHT'} />
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
              min={3}
              max={13}
              step={0.1}
            />
            <Text accent delay={9} text={'CAMERA'} />
          </Layout>
        </Layout>
      </Card>
    </div>
  </Layout>
</main>

<Canvas />

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  main {
    overflow: hidden;
    position: relative;
    display: flex;
    height: 100vh;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
  }
  span {
    background-color: var(--c-g);
  }

  .desktop {
    display: none;
    @include desktop {
      display: flex;
      align-items: end;
      gap: gap(2);
    }
  }
</style>
