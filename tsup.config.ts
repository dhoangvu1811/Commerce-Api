import { defineConfig } from 'tsup'
import path from 'path'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  minify: false,
  // Xử lý path alias ~/
  esbuildOptions(options) {
    options.alias = {
      '~': path.resolve(__dirname, './src')
    }
  }
})
