import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // DODAJ TĘ LINIKĘ (zmień 'nazwa-twojego-repo' na nazwę z adresu URL):
  base: '/parkerm1990.github.io/Pr/', 
})
