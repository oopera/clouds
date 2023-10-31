<script lang="ts">
  export let onclick: () => any = () => 0;
  export let id: string = '';
</script>

<button data-interactable {id} on:click={onclick}>
  <slot />
</button>

<style lang="scss">
  @import '$lib/styles/mixins.scss';
  button {
    @include tag;
    background-color: var(--c-g);
    border-radius: 0;
    transition: background-color 250ms var(--ease);
    will-change: background-color;
    border-radius: 4px;
    padding: 0 gap(3);
    &:hover,
    &:focus-visible {
      background-color: var(--c-ghover);
    }
    color: white;
  }
</style>
