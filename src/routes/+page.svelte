<script lang="ts">
  import '$lib/styles/style.scss';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';

  import Canvas from '$lib/components/Canvas.svelte';
  import Range_Input from '$lib/components/Range_Input.svelte';
  import Cursor from '$lib/components/Cursor.svelte';
  import Zoom_Input from '$lib/components/Zoom_Input.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import Axis_Indicator from '$lib/components/Axis_Indicator.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import Layout from '$lib/components/Layout.svelte';
  import Text from '$lib/components/Text.svelte';
  import Radio_Button from '$lib/components/Radio_Button.svelte';
  import Link from '$lib/components/Link.svelte';
  import Tag from '$lib/components/Tag.svelte';
  import DateInput from '$lib/components/Date_Input.svelte';

  inject({ mode: dev ? 'development' : 'production' });
</script>

<svelte:head>
  <title>Clouds — WebGPU</title>
</svelte:head>

<Cursor />
<Logo />

<main>
  <Layout padding="m" horizontal justify="between" align="start" gap="2">
    <Loading />
    <Layout align="end" gap="1" fit>
      <Tag>
        <Text text="all systems operational" />
        <span data-indicator />
      </Tag>

      <Text tertiary text={new Date().toISOString()} delay={10} />
      <DateInput />
      <Radio_Button
        delay={5}
        title="light_type"
        options={['day_cycle', 'full_day', 'full_night']}
      />
    </Layout>
  </Layout>

  <Layout padding="m" horizontal justify="between" align="end" gap="2">
    <Layout align="start" gap="6" fit>
      <Layout align="start" gap="0" fit>
        <Text tertiary text={'B.sc. Human Computer Interaction'} delay={10} />
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={11} text={'Frontend:'} />
          <Text vertical delay={15} text={'Sveltekit'} />
        </Layout>
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={12} text={'Backend:'} />
          <Text vertical delay={16} text={' Vercel Serverless'} />

          <Link href="https://github.com/amsokol/go-grib2">
            <Text tertiary vertical delay={19} text={'[go-grib2]'} /></Link
          >
        </Layout>
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={13} text={'Data:'} />
          <Text vertical delay={17} text={'nomads.ncep.noaa.gov'} />

          <Link href="https://nomads.ncep.noaa.gov/gribfilter.php?ds=gdas_0p25">
            <Text
              vertical
              tertiary
              delay={20}
              text={'[0.25 hourly TCDC]'}
            /></Link
          >
        </Layout>
        <Layout horizontal gap="1" justify="start">
          <Text nowrap secondary delay={14} text={'Render:'} />
          <Text vertical delay={18} text={'Webgpu'} />
        </Layout>
        <Layout horizontal justify="start" gap="1">
          <Link href="https://lucaslichner.de">
            <Text
              nowrap
              accent
              vertical
              delay={25}
              text={'Lucas Lichner.'}
            /></Link
          >
          <Link href="https://github.com/oopera/clouds">
            <Text nowrap accent vertical delay={28} text={'GitHub.'} /></Link
          >
        </Layout>
      </Layout>
    </Layout>
    <Axis_Indicator />
    <Layout align="end" gap="2" fit horizontal>
      <!-- <Layout align="end" gap="1" fit horizontal>
          <Checkbox delay={5} title="mb300" />
          <Checkbox delay={8} title="atmo" />
        </Layout> -->

      <Layout align="end" gap="1" fit>
        <Range_Input
          delay={8}
          title="cloud_density"
          min={0}
          max={0.5}
          step={0.01}
        />
        <Range_Input
          delay={8}
          title="raymarch_length"
          min={0.00001}
          max={0.0025}
          step={0.00005}
        />
        <Range_Input
          delay={8}
          title="raymarch_steps"
          min={1}
          max={99}
          step={1}
        />
        <Text accent vertical delay={9} text={'FORM'} />

        <Range_Input
          delay={8}
          title="rayleigh_intensity"
          min={0}
          max={2.0}
          step={0.05}
        />
        <Range_Input
          delay={8}
          title="sun_transmittance"
          min={0}
          max={0.025}
          step={0.0005}
        />
        <Text accent vertical delay={9} text={'LIGHT'} />
        <Range_Input
          delay={8}
          title="rotation_speed"
          min={0}
          max={5}
          step={0.25}
        />
        <Text accent vertical delay={9} text={'CAMERA'} />
      </Layout>

      <Zoom_Input delay={10} />
    </Layout>
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
</style>
