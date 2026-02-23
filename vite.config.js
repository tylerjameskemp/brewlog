import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite is the build tool — it bundles your code and runs the dev server
// Think of it like a super-fast compiler that watches your files and
// refreshes the browser when you make changes
export default defineConfig({
  plugins: [react()],
})
