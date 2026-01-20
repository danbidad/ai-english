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

    <div v-if="searchResults.length > 0" class="mt-8">
      <h2 class="text-xl font-bold mb-4">검색 결과</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="video in searchResults" 
          :key="video.id" 
          class="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
          @click="openVideo(video.id)"
        >
          <figure class="aspect-video relative">
            <img :src="video.thumbnail" class="w-full h-full object-cover" alt="Thumbnail" />
            <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
              {{ video.duration }}
            </div>
          </figure>
          <div class="card-body p-4">
            <h3 class="card-title text-base line-clamp-2" :title="video.title">{{ video.title }}</h3>
            <p class="text-sm opacity-70">{{ video.channel }} • {{ video.views }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="mt-8 flex justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div class="mt-8 prose max-w-none">
      <h2>사용 방법</h2>
      <ol>
        <li>YouTube URL, 영상 ID 또는 <strong>검색어</strong>를 입력하세요.</li>
        <li>URL/ID인 경우 바로 플레이어로 이동합니다.</li>
        <li>검색어인 경우 아래에 검색 결과가 나타납니다.</li>
        <li>원하는 영상을 클릭하여 자막을 확인하세요.</li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractYoutubeVideoID } from '../lib/youtube'
import { api } from '../lib/api'

const router = useRouter()
const input = ref('')
const error = ref('')
const loading = ref(false)
const searchResults = ref<any[]>([])

async function go() {
  error.value = ''
  searchResults.value = []
  
  if (!input.value) return

  // 1. URL 또는 ID인지 확인
  const id = extractYoutubeVideoID(input.value)
  if (id) {
    router.push({ name: 'youtubePlayer', params: { videoId: id } })
    return
  }

  // 2. 아니면 검색으로 간주
  loading.value = true
  try {
    const { data } = await api.get('/youtube/search', { params: { q: input.value } })
    if (data.items) {
      searchResults.value = data.items.map((item: any) => ({
        id: item.id,
        title: item.title,
        thumbnail: item.bestThumbnail?.url || item.thumbnails?.[0]?.url,
        duration: item.duration,
        channel: item.author?.name,
        views: item.views ? `${item.views} 조회` : '' // ytsr은 views를 숫자로 주거나 문자열로 줄 수 있음, 확인 필요
      }))
    }
    if (searchResults.value.length === 0) {
      error.value = '검색 결과가 없습니다.'
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || '검색 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

function openVideo(id: string) {
  router.push({ name: 'youtubePlayer', params: { videoId: id } })
}
</script>
