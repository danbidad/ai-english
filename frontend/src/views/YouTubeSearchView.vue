<template>
  <section class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">YouTube 도구</h1>

    <div class="card bg-base-200 shadow">
      <div class="card-body gap-4">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">YouTube URL 또는 비디오 ID</span></div>
          <input v-model.trim="input" @keyup.enter="go" type="text" placeholder="https://www.youtube.com/watch?v=... 또는 dQw4w9WgXcQ" class="input input-bordered w-full" />
        </label>
        <div class="card-actions justify-end">
          <button class="btn btn-primary" :disabled="!input" @click="go">열기</button>
        </div>
        <p v-if="error" class="text-error">{{ error }}</p>
      </div>
    </div>

    <div class="mt-8 prose max-w-none">
      <h2>사용 방법</h2>
      <ol>
        <li>YouTube URL 또는 영상 ID를 입력 후 Enter 또는 열기 버튼을 누르세요.</li>
        <li>플레이어 화면에서 자막 언어를 선택하고 세부 정보를 확인할 수 있습니다.</li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractYoutubeVideoID } from '../lib/youtube'

const router = useRouter()
const input = ref('')
const error = ref('')

function go() {
  error.value = ''
  const id = extractYoutubeVideoID(input.value) ?? input.value
  if (!id) {
    error.value = '유효한 YouTube URL 또는 영상 ID를 입력하세요.'
    return
  }
  router.push({ name: 'youtubePlayer', params: { videoId: id } })
}
</script>
