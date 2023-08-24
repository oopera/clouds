<script lang="ts">
  export let href: string = '/';
</script>

<a data-interactable target="_blank" {href}>
  <slot />
</a>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  a {
    @include link();
  }
</style>
