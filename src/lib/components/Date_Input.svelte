<script lang="ts">
  import { onMount } from 'svelte';
  import Text from './Text.svelte';
  import type { Stores } from '$lib/types/types';
  import Layout from './Layout.svelte';
  let mounted: boolean = false;

  onMount(async () => {
    mounted = true;
  });
</script>

<div class="date-input">
  <Layout gap="1" align="end" justify="between">
    <input data-interactable type="date" />
  </Layout>
</div>

<style lang="scss">
  .range-input {
    min-width: 144px;
    white-space: nowrap;
    box-sizing: border-box;
    z-index: 2;
  }

  input {
    appearance: none;
    -webkit-appearance: none;
    height: 28px;
    width: 156px;
    margin: 0;
    background-color: transparent;
    border: 1pt solid var(--c-tertiary);
    border-radius: 24px;
    padding: 8px 12px;
    box-sizing: border-box;
    font-family: var(--font-family-mono);

    background-position: right 12px center;
    outline: none;
    accent-color: white;
    color: var(--c-tertiary);
    transition: background-color 150ms var(--ease), color 150ms var(--ease);
    &:hover {
      background-color: var(--c-tertiary);
      color: var(--c-g);
    }
    &::-webkit-calendar-picker-indicator {
      background: url(https://mywildalberta.ca/images/GFX-MWA-Parks-Reservations.png)
        no-repeat;
      background-position: right 8px center;
      color: rgba(255, 255, 255, 1);
      opacity: 1;
      width: 28px;
      border-radius: 24px;
    }
  }

  input:focus {
    outline: none;
  }
</style>
