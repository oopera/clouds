<script lang="ts">
  export let red: boolean = false;
</script>

<span class:red>
  <slot />
</span>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  span {
    @include tag;
  }
  .red {
    background-color: rgb(255, 0, 0);
    color: white;
  }
</style>
