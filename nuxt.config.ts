// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'private-qr-video-color-mode',
  },
  runtimeConfig: {
    hotFolderPath: "",
    thumbnailFolderPath: "",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    
    r2AccountId: "",
    r2AccessKeyId: "",
    r2SecretAccessKey: "",
    r2BucketName: "",
    r2DownloadDomain: "",
    r2ObjectPrefix: "videos",

    uploadPollIntervalMs: 1000,
    uploadMaxRetries: 5,
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  css: ['./app/assets/css/main.css'],
  modules: ['@nuxt/eslint','@nuxt/ui']
})
