<script lang="ts">
  import { loading } from '$lib/stores/stores';
  import { onMount } from 'svelte';
  import Text from './Text.svelte';
  import Layout from './Layout.svelte';
  import Line from './Line.svelte';
  import IconButton from './IconButton.svelte';
  import Tag from './Tag.svelte';
  import Button from './Button.svelte';

  const translationsForLoading = [
    'Loading',
    'Cargando', // Spanish
    '加载中', // Mandarin (Simplified Chinese)
    'Carregando', // Portuguese
    'लोड हो रहा है', // Hindi
    'Yükleniyor', // Turkish
    'Загрузка', // Russian
    'Memuat', // Indonesian
    'Chargement', // French
    'Lade', // German
    '로딩 중', // Korean
    'Caricamento', // Italian
    'ローディング', // Japanese
    'تحميل', // Arabic
    'Načítání', // Czech
    'Laddar', // Swedish
    'Laden', // Dutch
    'Wczytywanie', // Polish
    'กำลังโหลด', // Thai
    'Đang tải', // Vietnamese
    'Завантаження', // Ukrainian
    'Încărcare', // Romanian
    'Φόρτωση', // Greek
    'Yüklemek', // Azerbaijani
    'Carregant', // Catalan
  ];

  const translationsForClouds = [
    'Nubes', // Spanish
    '云', // Mandarin (Simplified Chinese)
    'Nuvens', // Portuguese
    'बादल', // Hindi
    'Bulutlar', // Turkish
    'Облака', // Russian
    'Awan', // Indonesian
    'Nuages', // French
    'Wolken', // German
    '구름', // Korean
    'Nuvole', // Italian
    '雲', // Japanese
    'سحب', // Arabic
    'Oblaka', // Czech
    'Moln', // Swedish
    'Wolken', // Dutch
    'Chmury', // Polish
    'เมฆ', // Thai
    'Mây', // Vietnamese
    'Хмари', // Ukrainian
    'Norii', // Romanian
    'Σύννεφα', // Greek
    'Buludlar', // Azerbaijani
    'Núvols', // Catalan
  ];

  let mounted = false;
  let loaded = false;
  let deviceFailed = false;
  let currentTranslation = 0;

  setInterval(() => {
    if (currentTranslation === translationsForLoading.length - 1) {
      currentTranslation = 0;
    } else {
      currentTranslation++;
    }
  }, 1000);

  onMount(() => {
    setTimeout(() => {
      mounted = true;
    }, 1);
  });

  $: if (!$loading.welcome.status) {
    loaded = true;
  }

  $: if ($loading.welcome.message === 'error') {
    deviceFailed = true;
    setTimeout(() => {
      loaded = true;
    }, 1);
  }
</script>

<span>
  {#if mounted}
    <span class="parent" class:loaded>
      <Text type="h1" delay={4} text={'CLOUDS'} />
      {#if mounted && !loaded}
        <span class="loading">
          <Text text={translationsForLoading[currentTranslation]} />
          <!-- <p class="letter">{translationsForLoading[currentTranslation]}</p> -->
        </span>
      {/if}
    </span>
    <div class="typo" class:loaded>
      <Layout align="end" gap="2">
        <Tag red={deviceFailed}>
          <p>
            {deviceFailed
              ? 'Systems Not Operational'
              : 'All Systems Operational'}
          </p>
        </Tag>

        <div class="text">
          <Layout gap="1" align="end">
            <Text
              end
              delay={4}
              secondary={true}
              text={`${translationsForClouds[currentTranslation]} is a WEBGPU application to render meteorologically accurate cloud cover`}
            />
            <Line />

            <Layout horizontal gap="1" align="end" justify="end">
              <IconButton title="half_res" off_title="full_res" />
              <IconButton title="atmo" off_title="no_atmo" />
              <IconButton
                three
                title="day_cycle"
                off_title="full_day"
                third_title="full_night"
              />
            </Layout>
            {#if !deviceFailed}
              <Button id="download">
                <Text text="RENDER" />
              </Button>
            {:else}
              <Text
                end
                secondary={true}
                text="You must use a WebGPU Compatible Device and Browser."
              />
            {/if}
          </Layout>
        </div>
      </Layout>
    </div>
  {/if}
</span>

<style lang="scss">
  @import '$lib/styles/mixins.scss';

  .error {
    border: 1px solid var(--c-accent);
    padding: 12px;
    animation: blink 0.15s var(--ease) 6 alternate;
  }

  .text {
    max-width: 156px;
  }

  .loading {
    display: inline-block;
    position: relative;
    height: fit-content;
    width: fit-content;
  }

  .parent {
    position: fixed;
    display: flex;
    align-items: end;
    flex-direction: column;
    padding: 8px;
    top: 50%;
    right: 50%;
    transform: translate(50%, -50%);
    transition: 1250ms var(--ease);
    z-index: 1;
  }

  .typo {
    transform: translate(110%, 0%);
    transition: 1250ms var(--ease);
  }

  .loaded {
    opacity: 1;
    top: 0;
    right: 0;
    transform: translate(0%, 0%);
    position: relative;
  }
</style>
