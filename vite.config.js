import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    watch: {
      ignored: [resolve(__dirname, '.vercel/**/*')],
    },
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '/api'],
    },
    port: 3000,
  },
  css: {
    preprocessorOptions: {
      sass: {
        additionalData: `
          @import '$lib/sass/style'
          @import '$lib/sass/mixins'
        `,
      },
    },
  },
});
