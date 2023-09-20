<script lang="ts">
  import { onMount } from 'svelte';
  import Layout from './Layout.svelte';
  import { projection_date } from '$lib/stores/stores';
  import { dev } from '$app/environment';
  import Tooltip from './Tooltip.svelte';

  const getDateValues = (date: Date) => {
    var day = ('0' + date.getDate()).slice(-2);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var year = date.getFullYear().toString();

    return { day, month, year };
  };

  const getDateString = (date: {
    day: string;
    month: string;
    year: string;
  }) => {
    return `${date.year}-${date.month}-${date.day}`;
  };

  let mounted: boolean = false;

  let today = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  let tenDays = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  let current_date = getDateValues(today);
  let max_date = getDateValues(today);
  let min_date = getDateValues(tenDays);

  onMount(() => {
    mounted = true;

    projection_date.set({
      day: current_date.day,
      month: current_date.month,
      year: current_date.year,
    });
  });

  const oninput = (e: Event) => {
    if (!e.target) return;
    const date = new Date((e.target as HTMLInputElement).value);
    if (getDateValues(date) === $projection_date) return;
    current_date = getDateValues(date);
    projection_date.set({
      day: current_date.day,
      month: current_date.month,
      year: current_date.year,
    });
  };
</script>

<Tooltip text="Projection Date">
  <input
    data-interactable
    on:input={oninput}
    value={getDateString(current_date)}
    max={getDateString(max_date)}
    min={getDateString(min_date)}
    type="date"
  />
</Tooltip>

<style lang="scss">
  input {
    appearance: none;
    -webkit-appearance: none;

    margin: 0;
    background-color: var(--c-g);
    border: none;
    padding: 4px 8px;
    box-sizing: border-box;
    font-family: var(--font-family-mono);
    vertical-align: baseline;
    text-align: center;
    background-position: right 12px center;
    outline: none;
    accent-color: white;
    color: var(--c-tertiary);
    transition: background-color 150ms var(--ease), color 150ms var(--ease);
    font-size: 12px;
    gap: 8px;
    &:hover {
      background-color: var(--c-ghover);
    }
    &::-webkit-calendar-picker-indicator {
      filter: invert(1);
    }
  }

  input:focus {
    outline: none;
  }
</style>
