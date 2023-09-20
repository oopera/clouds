<script lang="ts">
  export let type: string;
</script>

<svg
  width="25"
  height="25"
  viewBox="0 0 340 340"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  {#if type === 'atmo'}
    <g clip-path="url(#clip0_420_638)">
      <circle cx="170" cy="170" r="125" fill="var(--icon)" />
      <path
        d="M340 170C340 263.888 263.888 340 170 340C76.1116 340 0 263.888 0 170C0 76.1116 76.1116 0 170 0C263.888 0 340 76.1116 340 170ZM16.0779 170C16.0779 255.009 84.9912 323.922 170 323.922C255.009 323.922 323.922 255.009 323.922 170C323.922 84.9912 255.009 16.0779 170 16.0779C84.9912 16.0779 16.0779 84.9912 16.0779 170Z"
        fill="var(--icon)"
      />
    </g>
    <defs>
      <clipPath id="clip0_420_638">
        <rect width="340" height="340" fill="white" />
      </clipPath>
    </defs>
  {:else if type === 'no_atmo'}
    <circle cx="170" cy="170" r="125" fill="var(--icon)" />
  {:else if type === 'full_res'}
    <rect
      x="0.672119"
      y="84.7759"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 0.672119 84.7759)"
      fill="var(--icon)"
    />
    <rect
      x="85.6719"
      y="0.224121"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 85.6719 0.224121)"
      fill="var(--icon)"
    />
    <rect
      x="169.776"
      y="254.775"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 169.776 254.775)"
      fill="var(--icon)"
    />
    <rect
      x="254.775"
      y="170.223"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 254.775 170.223)"
      fill="var(--icon)"
    />
    <rect
      x="0.223877"
      y="254.327"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 0.223877 254.327)"
      fill="var(--icon)"
    />
    <rect
      x="85.2239"
      y="169.775"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 85.2239 169.775)"
      fill="var(--icon)"
    />
    <rect
      x="170.224"
      y="85.2236"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 170.224 85.2236)"
      fill="var(--icon)"
    />
    <rect
      x="255.224"
      y="0.671875"
      width="84.7762"
      height="84.7762"
      transform="rotate(0.151367 255.224 0.671875)"
      fill="var(--icon)"
    />
  {:else if (type = 'half_res')}
    <rect y="170" width="170" height="170" fill="var(--icon)" />
    <rect x="170" width="170" height="170" fill="var(--icon)" />
  {/if}
</svg>
