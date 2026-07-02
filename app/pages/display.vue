<script setup>
const audioUnlocked = useState("display-audio-unlocked", () => false);
const isNavbarCollapsed = useState("app-navbar-collapsed", () => false);

const videoElement = ref(null);
const playbackBlocked = ref(false);
const playbackError = ref("");
let pollingInterval = null;

const {
  data: response,
  refresh,
  status,
  error,
} = await useFetch("/api/videos/latest", {
  key: "latest-display-video",
  default: () => ({ data: null }),
});

const latestVideo = computed(() => response.value?.data ?? null);

const qrAvailable = computed(
  () =>
    Boolean(latestVideo.value?.qrReady) &&
    Boolean(latestVideo.value?.downloadUrl),
);

const displayHeightClass = computed(() =>
  isNavbarCollapsed.value
    ? "min-h-dvh md:h-dvh"
    : "min-h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)]",
);

const displaySectionHeightClass = computed(() =>
  isNavbarCollapsed.value
    ? "min-h-dvh"
    : "min-h-[calc(100dvh-4rem)]",
);

const videoMessage = computed(() => {
  if (error.value) {
    return {
      title: "Gagal mengambil video",
      description: "Periksa koneksi atau server.",
    };
  }

  if (status.value === "pending") {
    return {
      title: "Memuat video...",
      description: "",
    };
  }

  return {
    title: "Menunggu video",
    description: "Video terbaru akan muncul otomatis.",
  };
});

const qrMessage = computed(() => {
  if (latestVideo.value) {
    return {
      title: "QR sedang disiapkan",
      description: "Video sedang di-upload.",
      icon: "i-lucide-loader-circle",
    };
  }

  return {
    title: "Belum ada video",
    description: "QR akan muncul setelah video diproses.",
    icon: "i-lucide-qr-code",
  };
});

async function playVideo() {
  const player = videoElement.value;

  if (!player || !latestVideo.value?.streamUrl) {
    return;
  }

  if (!audioUnlocked.value) {
    playbackBlocked.value = true;
    playbackError.value = "Aktifkan suara untuk mulai memutar video.";

    return;
  }

  player.muted = false;
  player.defaultMuted = false;
  player.volume = 1;

  try {
    await player.play();

    playbackBlocked.value = false;
    playbackError.value = "";
  } catch (playError) {
    playbackBlocked.value = true;

    playbackError.value =
      playError?.name === "NotAllowedError"
        ? "Browser memblokir autoplay dengan suara."
        : "Video tidak dapat diputar.";

    console.error("[Display] Playback error:", playError);
  }
}

async function reloadVideo() {
  await nextTick();
  videoElement.value?.load();
}

async function enableAudio() {
  audioUnlocked.value = true;
  await playVideo();
}

watch(
  () => latestVideo.value?.streamUrl,
  async (streamUrl, previousStreamUrl) => {
    if (streamUrl && streamUrl !== previousStreamUrl) {
      await reloadVideo();
    }
  },
);

onMounted(async () => {
  await reloadVideo();

  pollingInterval = window.setInterval(() => {
    void refresh();
  }, 1000);
});

onBeforeUnmount(() => {
  if (pollingInterval !== null) {
    window.clearInterval(pollingInterval);
  }

  videoElement.value?.pause();
});
</script>

<template>
  <main
    class="bg-elevated text-highlighted md:overflow-hidden"
    :class="displayHeightClass"
  >
    <section
      class="flex flex-col md:h-full md:min-h-0 md:flex-row"
      :class="displaySectionHeightClass"
    >
      <!-- VIDEO PANEL: rasio 2 -->
      <section
        class="flex h-[60dvh] min-w-0 basis-full items-center justify-center overflow-hidden bg-elevated p-4 md:h-full md:min-h-0 md:basis-[67%] md:p-6"
      >
        <!-- Container yang mengapit video -->
        <div
          v-if="latestVideo?.streamUrl"
          class="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden"
        >
          <video
            ref="videoElement"
            :src="latestVideo.streamUrl"
            playsinline
            loop
            preload="auto"
            class="block h-full w-full object-contain"
            @canplay="playVideo"
          >
            Browser tidak mendukung pemutaran video.
          </video>
        </div>

        <UEmpty
          v-else
          variant="naked"
          :title="videoMessage.title"
          :description="videoMessage.description"
          :ui="{
            title: error ? 'text-red-600' : 'text-highlighted',
            description: 'text-muted',
          }"
        >
          <template #leading>
            <UIcon
              :name="
                error
                  ? 'i-lucide-circle-alert'
                  : status === 'pending'
                    ? 'i-lucide-loader-circle'
                    : 'i-lucide-video'
              "
              class="size-10"
              :class="{
                'animate-spin': status === 'pending',
                'text-red-600': error,
                'text-muted': !error,
              }"
            />
          </template>
        </UEmpty>
      </section>

      <!-- QR PANEL: rasio 1 -->
      <aside
        class="flex min-w-0 basis-full flex-col items-center justify-center gap-5 overflow-y-auto border-t border-default bg-default p-5 text-default md:h-full md:min-h-0 md:basis-[33%] md:border-t-0 md:border-l md:p-7"
      >
        <h1 class="text-center text-3xl font-semibold">Scan To Download</h1>

        <UCard
          class="w-full max-w-[330px]"
          :variant="qrAvailable ? 'outline' : 'subtle'"
          :ui="{ body: 'p-3 sm:p-5' }"
        >
          <div class="grid aspect-square place-items-center">
            <ClientOnly v-if="qrAvailable">
              <div
                class="[&_canvas]:h-auto [&_canvas]:max-w-full [&_svg]:h-auto [&_svg]:max-w-full"
              >
                <QrCode :value="latestVideo.downloadUrl" :size="280" />
              </div>
            </ClientOnly>

            <UEmpty
              v-else
              variant="naked"
              :title="qrMessage.title"
              :description="qrMessage.description"
            >
              <template #leading>
                <UIcon
                  :name="qrMessage.icon"
                  class="size-10 text-primary"
                  :class="{
                    'animate-spin': latestVideo,
                  }"
                />
              </template>
            </UEmpty>
          </div>
        </UCard>

        <UBadge
          v-if="latestVideo"
          size="lg"
          variant="soft"
          :color="qrAvailable ? 'success' : 'neutral'"
        >
          {{ qrAvailable ? "QR Ready" : latestVideo.status }}
        </UBadge>
      </aside>
    </section>

    <!-- AUTOPLAY FALLBACK -->
    <UModal
      v-model:open="playbackBlocked"
      title="Aktifkan suara"
      :description="playbackError"
      :dismissible="false"
      :close="false"
      :ui="{
        content: 'max-w-md',
        footer: 'flex-col sm:flex-row',
      }"
    >
      <template #footer>
        <UButton
          block
          size="xl"
          label="Putar dengan Suara"
          icon="i-lucide-volume-2"
          @click="enableAudio"
        />

        <UButton
          block
          size="xl"
          label="Kembali ke Menu"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
          @click="navigateTo('/')"
        />
      </template>
    </UModal>
  </main>
</template>
