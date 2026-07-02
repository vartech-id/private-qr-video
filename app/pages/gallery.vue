<script setup>
import QrCode from "~/components/QrCode.vue";

const filters = reactive({
  status: "ALL",
  search: "",
  dateFrom: "",
  dateTo: "",
});

const statusOptions = [
  { label: "Semua status", value: "ALL" },
  { label: "QR Ready", value: "QR_READY" },
  { label: "Uploading", value: "UPLOADING" },
  { label: "Queued", value: "QUEUED" },
  { label: "Failed", value: "FAILED" },
];

const statusLabels = {
  DETECTED: "Terdeteksi",
  VALIDATING: "Validasi",
  READY: "Siap",
  QUEUED: "Antrean upload",
  UPLOADING: "Sedang upload",
  QR_READY: "QR Ready",
  FAILED: "Gagal",
};

const statusClasses = {
  QR_READY: "bg-green-700/90",
  FAILED: "bg-red-700/90",
  UPLOADING: "bg-amber-700/90",
  QUEUED: "bg-blue-700/90",
};

const galleryQuery = computed(() => ({
  status: filters.status === "ALL" ? undefined : filters.status,
  search: filters.search || undefined,
  dateFrom: filters.dateFrom || undefined,
  dateTo: filters.dateTo || undefined,
}));

const {
  data: response,
  refresh,
  status,
  error,
} = await useFetch("/api/videos", {
  key: "video-gallery",
  query: galleryQuery,
  watch: [galleryQuery],
});

const videos = computed(() => response.value?.data ?? []);

let pollingInterval;

function getStatusLabel(videoStatus) {
  return statusLabels[videoStatus] ?? videoStatus;
}

function getStatusClass(videoStatus) {
  return statusClasses[videoStatus] ?? "bg-slate-900/85";
}

function formatFileSize(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const size = bytes / 1024 ** index;

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDuration(durationMs) {
  if (!durationMs) {
    return "-";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(value) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function resetFilters() {
  Object.assign(filters, {
    status: "ALL",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
}

onMounted(() => {
  pollingInterval = window.setInterval(refresh, 2000);
});

onBeforeUnmount(() => {
  window.clearInterval(pollingInterval);
});
</script>

<template>
  <main class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">
    <!-- Filters -->
    <section
      class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      <UInput
        v-model="filters.search"
        type="search"
        icon="i-lucide-search"
        placeholder="Cari nama video..."
        size="lg"
        class="sm:col-span-2 xl:col-span-1"
      />

      <USelect
        v-model="filters.status"
        :items="statusOptions"
        size="lg"
        class="w-full"
      />

      <UInput
        v-model="filters.dateFrom"
        type="date"
        size="lg"
      />

      <UInput
        v-model="filters.dateTo"
        type="date"
        size="lg"
      />

      <UButton
        label="Reset"
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="outline"
        size="lg"
        block
        @click="resetFilters"
      />
    </section>

    <!-- Loading -->
    <section
      v-if="status === 'pending' && !videos.length"
      class="py-16 text-center text-muted"
    >
      Memuat gallery...
    </section>

    <!-- Error -->
    <section
      v-else-if="error && !videos.length"
      class="rounded-xl bg-red-50 p-6 text-center text-red-700"
    >
      Gagal memuat gallery: {{ error.message }}
    </section>

    <!-- Video gallery -->
    <section
      v-else-if="videos.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
    >
      <article
        v-for="video in videos"
        :key="video.id"
        class="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-lg dark:bg-gray-900 dark:ring-gray-800"
      >
        <UModal
          title="Video preview"
          :description="`Video ID: ${video.id}`"
          :ui="{
            content: 'w-[calc(100vw-2rem)] max-w-7xl',
          }"
        >
          <!-- Card sebagai trigger -->
          <div class="group cursor-pointer">
            <div
              class="relative aspect-[4/3] overflow-hidden bg-gray-950"
            >
              <img
                v-if="video.thumbnailUrl"
                :src="video.thumbnailUrl"
                :alt="`Thumbnail ${video.fileName}`"
                loading="lazy"
                class="h-full w-full object-contain transition duration-300 group-hover:scale-105"
              />

              <div
                v-else
                class="grid h-full place-items-center p-5 text-center text-sm text-gray-400"
              >
                Thumbnail belum tersedia
              </div>

              <span
                class="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur"
                :class="getStatusClass(video.status)"
              >
                {{ getStatusLabel(video.status) }}
              </span>
            </div>

            <div class="p-4">
              <h2
                :title="video.fileName"
                class="mb-4 truncate text-base font-semibold"
              >
                {{ video.fileName }}
              </h2>

              <dl class="space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Ukuran</dt>
                  <dd class="font-medium">
                    {{ formatFileSize(video.fileSize) }}
                  </dd>
                </div>

                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Durasi</dt>
                  <dd class="font-medium">
                    {{ formatDuration(video.durationMs) }}
                  </dd>
                </div>

                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Dibuat</dt>
                  <dd class="text-right font-medium">
                    {{ formatDate(video.createdAt) }}
                  </dd>
                </div>
              </dl>

              <p
                v-if="video.status === 'FAILED'"
                class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {{ video.errorMessage || "Proses gagal" }}
              </p>
            </div>
          </div>

          <!-- Modal body -->
          <template #body>
            <div class="flex flex-col gap-6 lg:flex-row">
              <!-- Video: 2/3 -->
              <div
                class="flex min-h-64 min-w-0 items-center justify-center lg:basis-2/3"
              >
                <video
                  v-if="video.streamUrl"
                  :src="video.streamUrl"
                  controls
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  class="max-h-[70vh] w-full rounded-xl bg-black object-contain"
                >
                  Browser tidak mendukung pemutaran video.
                </video>

                <div
                  v-else
                  class="grid min-h-64 w-full place-items-center rounded-xl bg-gray-100 text-muted dark:bg-gray-800"
                >
                  Video belum tersedia
                </div>
              </div>

              <!-- QR: 1/3 -->
              <aside
                class="flex min-h-56 flex-col items-center justify-center gap-4 border-t border-gray-200 pt-6 text-center lg:basis-1/3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 dark:border-gray-800"
              >
                <div>
                  <h2 class="text-2xl font-semibold">
                    Scan Here
                  </h2>
                </div>

                <ClientOnly v-if="video.qrReady && video.downloadUrl">
                  <QrCode
                    :value="video.downloadUrl"
                    :size="200"
                  />
                </ClientOnly>

                <div
                  v-else
                  class="grid size-[200px] place-items-center rounded-xl bg-gray-100 p-5 text-sm text-muted dark:bg-gray-800"
                >
                  QR belum tersedia
                </div>
              </aside>
            </div>
          </template>
        </UModal>
      </article>
    </section>

    <!-- Empty -->
    <section
      v-else
      class="py-16 text-center text-muted"
    >
      Belum ada video.
    </section>
  </main>
</template>