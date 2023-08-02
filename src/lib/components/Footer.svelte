<script>
  import Text from './Text.svelte';
</script>

<footer class="footer">
  <Text delay={10}>BSC BSC BSC BSC</Text>
  <Text delay={11}>Custom Webgpu Engine + nomads.ncep.noaa</Text>
  <Text delay={12}>Sveltekit + Vercel Serverless Functions</Text>
  <Text delay={13}>Fonts: PPCirka, PPSupply</Text>
  <a data-interactable target="_blank" href="https://lucaslichner.de">
    <Text delay={14}>Lucas Lichner</Text></a
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
