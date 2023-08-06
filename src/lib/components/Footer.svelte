<script>
  import Text from './Text.svelte';

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

<footer class="footer">
  <Text secondary vertical text={'BSC BSC BSC BSC'} delay={10} />
  <Text vertical delay={11} text={'Custom Webgpu Engine + nomads.ncep.noaa'} />
  <Text
    vertical
    delay={12}
    text={'Sveltekit + Vercel Serverless Go Function'}
  />
  <a data-interactable target="_blank" href="https://lucaslichner.de">
    <Text vertical delay={14} text={'Lucas Lichner'} /></a
  >
</footer>

<style>
  .footer {
    position: relative;
    z-index: 10;
    width: 340px;
    color: white;
  }
</style>
