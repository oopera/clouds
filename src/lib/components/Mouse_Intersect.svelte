<script lang="ts">
  import { mouse_interaction } from '$lib/stores/stores';
  import { onMount } from 'svelte';
  import Layout from './Layout.svelte';
  import Text from './Text.svelte';

  let mouseInteraction;
  let mounted = false;

  mouse_interaction.subscribe((value) => {
    mouseInteraction = value;
    console.log(mouseInteraction);
  });

  onMount(() => {
    mounted = true;
  });
</script>

<Layout gap="2" align="end">
  <Text text="Mouse Interaction" accent vertical />

  <Layout horizontal gap="2" align="end">
    <Text text={mouseInteraction.latitude.toString()} vertical />
    <Text text={mouseInteraction.longitude.toString()} vertical />
  </Layout>
</Layout>
