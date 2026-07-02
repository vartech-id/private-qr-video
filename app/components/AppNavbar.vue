<script setup>
const route = useRoute();
const isCollapsed = useState("app-navbar-collapsed", () => false);

const pages = {
  "/admin": "Admin Settings",
  "/display": "Display",
  "/gallery": "Gallery",
};

const navItems = [
  {
    label: "Gallery",
    icon: "i-lucide-images",
    to: "/gallery",
  },
  {
    label: "Display",
    icon: "i-lucide-monitor-play",
    to: "/display",
  },
  {
    label: "Admin",
    icon: "i-lucide-settings",
    to: "/admin",
  },
];

const isVisible = computed(() =>
  Object.prototype.hasOwnProperty.call(pages, route.path),
);

function isActive(path) {
  return route.path === path;
}

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <UButton
    v-if="isVisible && isCollapsed"
    class="fixed left-3 top-3 z-50 shadow-lg"
    icon="i-lucide-panel-top-open"
    label="Show nav"
    color="neutral"
    variant="solid"
    :aria-expanded="false"
    aria-controls="app-navbar"
    @click="toggleCollapsed"
  />

  <header
    v-else-if="isVisible"
    id="app-navbar"
    class="sticky top-0 z-50 border-b border-default bg-default/95 backdrop-blur supports-[backdrop-filter]:bg-default/80"
  >
    <UContainer
      class="flex h-16 max-w-screen-2xl items-center justify-between gap-3"
    >
      <div class="flex min-w-0 items-center gap-3">
        <UButton
          to="/"
          icon="i-lucide-arrow-left"
          label="Menu"
          color="neutral"
          variant="ghost"
        />

        <UButton
          icon="i-lucide-panel-top-close"
          label="Collapse"
          color="neutral"
          variant="ghost"
          :aria-expanded="true"
          aria-controls="app-navbar"
          @click="toggleCollapsed"
        />
      </div>

      <nav
        id="app-navbar-links"
        aria-label="Primary navigation"
        class="flex min-w-0 items-center gap-1 overflow-x-auto"
      >
        <UButton
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          color="neutral"
          :variant="isActive(item.to) ? 'soft' : 'ghost'"
          class="shrink-0"
        />
      </nav>
    </UContainer>
  </header>
</template>
