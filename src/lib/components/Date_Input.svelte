<script lang="ts">
  import { onMount } from 'svelte';
  import { projection_date } from '$lib/stores/stores';
  import Tooltip from './Tooltip.svelte';

  const getDateValues = (date: Date) => {
    const day = ('0' + date.getUTCDate()).slice(-2);
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    const year = date.getUTCFullYear().toString();
    return { day, month, year };
  };

  const getTimeValues = (date: Date) => {
    const hours = ('0' + date.getUTCHours()).slice(-2);
    const minutes = ('0' + date.getUTCMinutes()).slice(-2);
    return { hours, minutes };
  };

  const getUTCDateString = (
    date: {
      day: string;
      month: string;
      year: string;
    },
    time: {
      hours: string;
      minutes: string;
    }
  ) => {
    return `${date.year}-${date.month}-${date.day}T${time.hours}:${time.minutes}`;
  };

  const getNearestForecastValues = (targetDate: Date) => {
    const now = new Date(Date.now());

    let modelRunDate = targetDate;
    let modelRunTime;
    if (targetDate > now) {
      modelRunDate = now;
      modelRunTime = Math.floor(now.getUTCHours() / 6) * 6;
    } else {
      modelRunTime = Math.floor(targetDate.getUTCHours() / 6) * 6;
    }

    const targetTimestamp = targetDate.getTime();
    const modelRunTimestamp = new Date(
      Date.UTC(
        modelRunDate.getUTCFullYear(),
        modelRunDate.getUTCMonth(),
        modelRunDate.getUTCDate(),
        modelRunTime
      )
    ).getTime();
    let forecastHours =
      (targetTimestamp - modelRunTimestamp) / (1000 * 60 * 60);

    // Adjust for 3-hour increments after 120 hours
    if (forecastHours >= 120) {
      forecastHours = Math.round(forecastHours / 3) * 3;
    }

    return {
      modelRunDate: getDateValues(modelRunDate),
      modelRunTime: modelRunTime.toString().padStart(2, '0'),
      forecastHours: Math.floor(forecastHours).toString().padStart(3, '0'),
    };
  };

  let today = new Date(Date.now());
  let tenDays = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  let sixteenDays = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000);

  let projected_date = getDateValues(today);
  let projected_time = getTimeValues(today);

  let max_date = getDateValues(sixteenDays);
  let min_date = getDateValues(tenDays);

  let { modelRunTime, forecastHours, modelRunDate } =
    getNearestForecastValues(today);

  onMount(() => {
    projection_date.set({
      modelRunDate,
      modelRunTime,
      forecastHours,
    });
  });

  const onchange = (e: Event) => {
    if (!e.target) return;
    const date = new Date((e.target as HTMLInputElement).value);
    projected_date = getDateValues(date);
    projected_time = getTimeValues(date);

    let { modelRunTime, forecastHours, modelRunDate } =
      getNearestForecastValues(date);
    console.log(modelRunTime, forecastHours, modelRunDate, today);
    projection_date.set({
      modelRunDate,
      modelRunTime,
      forecastHours,
    });
  };
</script>

<Tooltip text="Projection Date">
  <input
    data-interactable
    on:change={onchange}
    value={getUTCDateString(projected_date, projected_time)}
    max={getUTCDateString(max_date, { hours: '00', minutes: '00' })}
    min={getUTCDateString(min_date, { hours: '00', minutes: '00' })}
    type="datetime-local"
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
