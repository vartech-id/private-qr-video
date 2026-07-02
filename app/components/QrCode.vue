<script setup>
const props = defineProps({
  value: {
    type: String,
    required: true,
  },

  size: {
    type: Number,
    default: 220,
  },
});

const canvasElement = ref(null);

let renderVersion = 0;

async function renderQrCode() {
  if (!import.meta.client) {
    return;
  }

  if (!props.value || !canvasElement.value) {
    return;
  }

  const currentVersion = ++renderVersion;

  await nextTick();

  const qrCodeModule = await import("qrcode");

  if (
    currentVersion !== renderVersion ||
    !canvasElement.value
  ) {
    return;
  }

  await qrCodeModule.default.toCanvas(
    canvasElement.value,
    props.value,
    {
      width: props.size,
      margin: 1,
      errorCorrectionLevel: "H",
    },
  );
}

watch(
  () => [props.value, props.size],
  () => {
    void renderQrCode();
  },
);

onMounted(() => {
  void renderQrCode();
});
</script>

<template>
  <canvas
    ref="canvasElement"
    class="qr-code"
    :width="size"
    :height="size"
  />
</template>

<style scoped>
.qr-code {
  display: block;
  max-width: 100%;
  height: auto;
  background: white;
}
</style>