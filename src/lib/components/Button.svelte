<script lang="ts">
  export let onclick: () => any = () => 0;
</script>

<button data-interactable on:click={onclick}>
  <slot />
</button>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  button {
    @include tag;
    background-color: var(--c-g);
    z-index: 1;
    border-radius: 0;
    :hover {
      background-color: var(--c-ghover);
    }
  }
</style>
