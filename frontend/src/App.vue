<template>
  <div class="min-h-screen bg-base-100 text-base-content">
    <div class="navbar bg-base-200 shadow">
      <div class="container mx-auto">
        <div class="flex-1">
          <RouterLink to="/" class="btn btn-ghost normal-case text-xl">AI Test</RouterLink>
        </div>
        <div class="flex-none gap-2">
          <RouterLink to="/youtube" class="btn btn-ghost">YouTube</RouterLink>
          <RouterLink to="/sentence" class="btn btn-ghost">Sentence</RouterLink>
        </div>
      </div>
    </div>
    <main class="container mx-auto p-4">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
// no-op
</script>
