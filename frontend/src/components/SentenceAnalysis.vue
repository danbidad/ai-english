<template>
  <div class="mt-6" v-if="loading">
    <span class="loading loading-spinner loading-lg"></span>
  </div>

  <div v-if="blocks.length" class="mt-6 space-y-4">
    <div class="alert alert-info">총 {{ blocks.length }}개 블록</div>
    <div class="space-y-4">
      <div v-for="(b, idx) in blocks" :key="idx" class="p-4 rounded-xl bg-base-200">
        <div class="font-mono text-sm opacity-70">#{{ idx + 1 }}</div>
        <div><span class="badge badge-outline mr-2">block</span> {{ b.text_block }}</div>
        <div v-if="b.block_translation"><span class="badge mr-2">번역</span>{{ b.block_translation }}</div>
        <div v-if="b.blocks_translation"><span class="badge mr-2">누적번역</span>{{ b.blocks_translation }}</div>
        <div v-if="b.state"><span class="badge mr-2">state</span>{{ b.state }}</div>
        <div v-if="b.predict_state"><span class="badge mr-2">predict</span>{{ b.predict_state }}</div>
        <div v-if="b.predict_state2"><span class="badge mr-2">predict2</span>{{ b.predict_state2 }}</div>
      </div>
    </div>
  </div>

  <div v-else-if="raw" class="mt-6">
    <h3 class="font-bold mb-2">응답</h3>
    <pre class="p-4 bg-base-200 rounded-box overflow-auto whitespace-pre-wrap">{{ raw }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../lib/api'

type Block = {
  text_block?: string
  block_translation?: string
  blocks_translation?: string
  state?: string
  predict_state?: string
  predict_state2?: string
}

const loading = ref(false)
const blocks = ref<Block[]>([])
const raw = ref('')

const emit = defineEmits<{
  (e: 'error', message: string): void
}>()

async function analyze(text: string) {
  loading.value = true
  // 에러 초기화는 부모가 처리
  blocks.value = []
  raw.value = ''
  try {
    const { data } = await api.post('/sentence/analysis', { text })
    const content = data?.response ?? ''
    raw.value = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    // JSON 파싱 시도
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content
      if (Array.isArray(parsed)) {
        blocks.value = parsed
      }
    } catch (_) {
      // 파싱 불가하면 raw만 표시
    }
  } catch (e: any) {
    const errorMessage = e?.response?.data?.error || e?.message || '분석 중 오류가 발생했습니다.'
    emit('error', errorMessage)
  } finally {
    loading.value = false
  }
}

// 부모 컴포넌트에서 호출할 수 있도록 함수 노출
defineExpose({ analyze })
</script>
