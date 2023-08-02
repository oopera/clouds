<script lang="ts">
  import Text from './Text.svelte';
</script>

<div class="viewfinder">
  <div class="flex">
    <Text delay={10}>Upcoming:</Text>
    <br />
    <div class="item">
      <Text secondary delay={11} type="p">(improve)</Text>
      <Text delay={12}>Volumetric Cloud Rendering</Text>
    </div>
    <div class="item">
      <Text secondary delay={12} type="p">(improve)</Text>
      <Text delay={13}>Dynamic Light and shimmer</Text>
    </div>
    <Text delay={14}>Cloud Dissapation animation</Text>
    <Text delay={15}>User Date Input</Text>

    <div class="item">
      <Text secondary delay={16} type="p">♡＼(￣▽￣)／♡</Text>
      <Text delay={17}>Make it cuter</Text>
    </div>
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
