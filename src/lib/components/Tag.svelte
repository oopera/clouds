<script lang="ts">
</script>

<span>
  <slot />
</span>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  span {
    @include tag;
  }
</style>
