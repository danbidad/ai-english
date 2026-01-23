<template>
  <section class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">YouTube 플레이어</h1>
      <RouterLink to="/youtube" class="btn btn-ghost">다시 검색</RouterLink>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      <div class="md:col-span-2">
        <div class="aspect-video w-full bg-base-200 rounded-box overflow-hidden">
          <iframe
            v-if="videoId"
            class="w-full h-full"
            :src="`https://www.youtube-nocookie.com/embed/${videoId}`"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>

        <div v-if="details" class="mt-4 prose max-w-none">
          <h2>{{ details.title }}</h2>
          <p class="opacity-80">{{ details.description }}</p>
        </div>
      </div>

      <div class="md:col-span-1">
        <div class="card bg-base-200 shadow">
          <div class="card-body gap-3">
            <div class="form-control">
              <label class="label"><span class="label-text">자막 언어 1</span></label>
              <select class="select select-bordered" v-model="lang1">
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">자막 언어 2 (선택)</span></label>
              <select class="select select-bordered" v-model="lang2">
                <option value="">없음</option>
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <div class="card-actions justify-end">
              <button class="btn btn-primary" :disabled="loading" @click="loadDetails">자막 불러오기</button>
            </div>

            <p v-if="error" class="text-error">{{ error }}</p>
          </div>
        </div>

        <div class="mt-4">
          <h3 class="font-bold mb-2">자막 미리보기</h3>
          <div v-if="loading" class="loading loading-spinner"></div>
          <div v-else class="space-y-2 max-h-[50vh] overflow-auto">
            <div v-for="(cap, idx) in previewCaptions" :key="idx" class="p-2 rounded hover:bg-base-200">
              <div class="text-sm opacity-70">{{ formatTime(cap.start) }} - {{ formatTime(cap.end) }}</div>
              <div>{{ cap.text }}</div>
              <div v-if="cap.text2" class="opacity-80">{{ cap.text2 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../lib/api'

type Caption = { start: number; end: number; text: string; text2?: string }
type VideoDetails = { title: string; description?: string }

const route = useRoute()
const videoId = String(route.params.videoId || '')

const lang1 = ref<'ko' | 'en' | 'ja'>('ko')
const lang2 = ref('')
const loading = ref(false)
const error = ref('')
const details = ref<VideoDetails | null>(null)
const captions = ref<Caption[]>([])

const previewCaptions = computed(() => captions.value.slice(0, 50))

function formatTime(sec: number) {
  if (!sec && sec !== 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function loadDetails() {
  if (!videoId) return
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = { lang: lang1.value }
    if (lang2.value) params.lang2 = lang2.value
    const { data } = await api.get(`/youtube/info/${encodeURIComponent(videoId)}`, { params })
    // 예상 응답 구조에 맞게 매핑 (utils/youtube_caption.ts를 참고했을 때 title/description/subtitles 형태 가정)
    details.value = { title: data.title ?? data.video?.title ?? '제목 없음', description: data.description ?? data.video?.description }
    captions.value = (data.subtitles ?? data.captions ?? []).map((c: any) => ({
      start: c.start ?? c.startMs / 1000,
      end: (c.start ?? c.startMs / 1000) + (c.duration ?? c.dur ?? 0),
      text: c.text ?? c.text1 ?? c.content ?? '',
      text2: c.text2 ?? c.translation ?? undefined,
    }))
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || '자막 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetails()
})

watch([lang1, lang2], () => {
  // 언어 변경 시 자동 재로드 (디바운스 필요시 개선)
  loadDetails()
})
</script>
