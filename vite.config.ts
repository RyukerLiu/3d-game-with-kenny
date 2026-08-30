import {defineConfig} from 'vite'

const allowedHosts=(process.env.DEV_ALLOWED_HOSTS??'')
  .split(',')
  .map(host=>host.trim())
  .filter(Boolean)

export default defineConfig({
  server:{allowedHosts},
  preview:{allowedHosts},
})
