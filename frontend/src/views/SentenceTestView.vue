<template>
  <section class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">문장 분석</h1>
    
    <div class="card bg-base-200 shadow mb-6">
      <div class="card-body gap-4">
        <label class="form-control">
          <div class="label"><span class="label-text">영문 문장을 입력하세요</span></div>
          <textarea v-model="text" class="textarea textarea-bordered h-28" placeholder="Enter an English sentence..."></textarea>
        </label>
        <div class="card-actions justify-end">
          <button class="btn btn-primary" :disabled="!text.trim()" @click="handleAnalyze">분석</button>
        </div>
        <p v-if="error" class="text-error font-medium">{{ error }}</p>
      </div>
    </div>

    <SentenceAnalysis ref="analysisRef" @error="handleError" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SentenceAnalysis from '../components/SentenceAnalysis.vue'

const text = ref('')
const error = ref('')
const analysisRef = ref<InstanceType<typeof SentenceAnalysis> | null>(null)

function handleAnalyze() {
  if (analysisRef.value && text.value.trim()) {
    error.value = '' // 초기화
    analysisRef.value.analyze(text.value)
  }
}

function handleError(msg: string) {
  error.value = msg
}
</script>
