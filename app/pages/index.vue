<script setup>
const audioUnlocked = useState(
  "display-audio-unlocked",
  () => false,
);

function openDisplay() {
  audioUnlocked.value = true;

  return navigateTo("/display");
}
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-elevated p-4">
    <UCard
      class="w-full max-w-xl"
      :ui="{ body: 'p-6 sm:p-9' }"
    >
      <div class="mb-8 text-center">
        <h1
          class="text-3xl font-bold text-highlighted sm:text-4xl"
        >
          Control Panel
        </h1>
      </div>

      <div class="grid gap-3">
        <UButton
          block
          loading-auto
          size="xl"
          label="Buka Display dengan Suara"
          icon="i-lucide-monitor-play"
          @click="openDisplay"
        />

        <UButton
          block
          to="/gallery"
          size="xl"
          label="Gallery"
          icon="i-lucide-images"
          color="neutral"
          variant="outline"
        />

        <UButton
          block
          to="/admin"
          size="xl"
          label="Settings"
          icon="i-lucide-settings"
          color="neutral"
          variant="outline"
        />
      </div>
    </UCard>
  </main>
</template>