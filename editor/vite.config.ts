import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // Tipi e costanti del motore condivisi col gioco (dependency-free).
    alias: { '@game': path.resolve(here, '../frontend/src') },
  },
  server: {
    port: 5174,
    fs: { allow: [path.resolve(here, '..')] },
  },
})
