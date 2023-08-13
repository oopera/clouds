<script lang="ts">
  export let href: string = '/';
</script>

<a data-interactable class="link" target="_blank" {href}>
  <slot />
</a>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  .link {
    @include link();
  }
</style>
