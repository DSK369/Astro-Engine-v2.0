import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Only the production build needs the subpath — GitHub Pages serves
  // this as https://dsk369.github.io/Astro-Engine-v2.0/ (a project page,
  // not a user/org root page), so built asset URLs need the prefix or
  // they 404 looking for /assets/... at the domain root. `npm run dev`
  // stays at '/' so local testing URLs don't change.
  base: command === 'build' ? '/Astro-Engine-v2.0/' : '/',
}))
