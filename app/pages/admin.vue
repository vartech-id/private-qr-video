<script setup>
const toast = useToast();

const form = reactive({
  hotFolderPath: "",
  processExistingVideos: false,
});

const isSaving = ref(false);

const {
  data: response,
  refresh,
  status,
  error,
} = await useFetch("/api/admin/settings", {
  key: "admin-settings",
  default: () => ({ data: null }),
});

const settings = computed(() => response.value?.data ?? null);

watch(
  settings,
  (value) => {
    if (!value) return;

    form.hotFolderPath = value.hotFolderPath ?? "";
    form.processExistingVideos =
      value.processExistingVideos ?? false;
  },
  { immediate: true },
);

async function saveSettings() {
  const hotFolderPath = form.hotFolderPath.trim();

  if (!hotFolderPath) {
    toast.add({
      title: "Hot-folder path wajib diisi",
      color: "error",
      icon: "i-lucide-circle-alert",
    });

    return;
  }

  isSaving.value = true;

  try {
    await $fetch("/api/admin/settings", {
      method: "PATCH",
      body: {
        hotFolderPath,
        processExistingVideos: form.processExistingVideos,
      },
    });

    await refresh();

    toast.add({
      title: "Hot folder berhasil diaktifkan",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Gagal menyimpan hot folder",
      description:
        error?.data?.message ||
        error?.message ||
        "Terjadi kesalahan pada server.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <main class="min-h-dvh bg-elevated">
    <UContainer class="max-w-4xl py-6 sm:py-10">
      <!-- Header -->
      <header
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 class="text-3xl font-bold text-highlighted">
            Admin Settings
          </h1>

          <p class="mt-1 text-muted">
            Copy dan paste folder yang akan dipantau.
          </p>
        </div>

      </header>

      <!-- Loading -->
      <UCard v-if="status === 'pending'">
        <div
          class="flex min-h-64 items-center justify-center gap-3 text-muted"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin"
          />

          <span>Memuat konfigurasi...</span>
        </div>
      </UCard>

      <!-- Fetch error -->
      <UAlert
        v-else-if="error"
        title="Gagal memuat konfigurasi"
        :description="error.message"
        color="error"
        icon="i-lucide-circle-alert"
      />

      <!-- Form -->
      <UCard v-else>
        <form class="space-y-6" @submit.prevent="saveSettings">
          <UFormField
            label="Hot-folder path"
            description="Gunakan absolute path Windows."
            required
          >
            <UInput
              v-model="form.hotFolderPath"
              placeholder="D:/CapCut/Exports"
              icon="i-lucide-folder"
              autocomplete="off"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <USwitch
            v-model="form.processExistingVideos"
            label="Proses video yang sudah ada"
            description="Video lama dalam folder akan ikut diproses ketika folder diaktifkan."
          />

          <!-- Watcher status -->
          <UCard
            v-if="settings"
            variant="subtle"
            :ui="{ body: 'space-y-4' }"
          >
            <div
              class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-sm text-muted">
                Configuration source
              </span>

              <span class="font-medium text-highlighted">
                {{ settings.source }}
              </span>
            </div>

            <div
              class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-sm text-muted">
                Watcher
              </span>

              <UBadge
                :color="
                  settings.watcher.running
                    ? 'success'
                    : 'neutral'
                "
                variant="soft"
              >
                {{
                  settings.watcher.running
                    ? "Aktif"
                    : "Tidak aktif"
                }}
              </UBadge>
            </div>

            <div class="space-y-1">
              <p class="text-sm text-muted">
                Folder aktif
              </p>

              <p class="break-all font-medium text-highlighted">
                {{ settings.watcher.hotFolderPath || "-" }}
              </p>
            </div>
          </UCard>

          <UButton
            type="submit"
            block
            size="xl"
            icon="i-lucide-save"
            label="Save and Activate"
            loading-label="Mengaktifkan..."
            :loading="isSaving"
          />
        </form>
      </UCard>
    </UContainer>
  </main>
</template>