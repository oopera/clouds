<script lang="ts">
  import Text from './Text.svelte';

  let delay = 0;
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

<div class="viewfinder">
  <div class="flex">
    {#each tasks as task, i}
      {#if task.a !== ''}
        <div class="item">
          <Text
            vertical
            text={task.a}
            secondary
            delay={delay + i + 1}
            type="p"
          />
          <Text vertical delay={delay + i} text={task.b} />
        </div>
      {:else}
        <Text vertical delay={delay + i} text={task.b} />
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .item {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .flex {
    display: flex;
    flex-direction: column;
    height: fit-content;
    justify-content: center;
    align-items: flex-end;
    text-align: right;
  }
</style>
