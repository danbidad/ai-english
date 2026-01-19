/*
1. 시간 측정 (Measuring Mode)
Problem: 일부 환경/브라우저/목소리에서 boundary 이벤트가 발생하지 않아 단어 하이라이팅이 되지 않는 문제.
Solution: 문장을 처음부터 끝까지 재생할 때 실제 소요되는 시간(duration)을 측정합니다.
UI: 측정 중일 때는 우측 상단에 ⏱️ 시간 측정 중... 배지가 표시됩니다.
2. 데이터 캐싱 및 학습
Logic: 측정된 시간은 문장 내용 + 재생 속도(Rate)를 키(Key)로 하여 메모리에 캐싱됩니다.
Effect: 한 번 측정된 문장은 다음 재생부터 즉시 정확한 타이밍으로 하이라이팅됩니다. 속도를 변경하면 키가 달라지므로 새로 측정합니다.
3. 단어 하이라이팅 알고리즘
Algorithm: 글자 수 비례 배분 (Character-Length Proportional Distribution)
전체 재생 시간(Duration)을 문장의 총 글자 수로 나누어 글자당 시간을 산출하고, 각 단어의 길이에 비례하여 타임라인을 생성합니다.
requestAnimationFrame을 사용하여 부드럽게 현재 단어를 추적합니다.
사용 방법
최초 재생: Play 버튼을 누르면 "시간 측정 중"이 뜨면서 재생됩니다. 이때는 대략적인 하이라이팅만 되거나 되지 않을 수 있습니다.
재생 완료 후: 측정이 완료되면 내부적으로 시간이 저장됩니다.
재생 반복: 다시 Play를 누르거나 특정 단어를 클릭하면, 저장된 시간을 바탕으로 정확하게 단어 색상이 변하는 것을 볼 수 있습니다.
속도 조절: 설정(⚙️)에서 속도를 바꾸면 기존 측정값 대신 새로운 속도에 맞춰 다시 측정 모드로 진입합니다.
*/

<template>
  <div class="modal modal-open">
    <div class="modal-box max-w-[80%] text-center relative">
      <button class="btn btn-sm btn-circle btn-ghost absolute left-2 top-2" @click="showSettings = true">⚙️</button>
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="$emit('close')">✕</button>
      
      <!-- Measuring Indicator -->
      <div v-if="isMeasuring" class="absolute top-2 right-12 badge badge-warning gap-2 animate-pulse z-50">
        <span>⏱️ 시간 측정 중...</span>
      </div>

      <!-- Settings Modal -->
      <Teleport to="body">
        <div v-if="showSettings" class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50" @click="showSettings = false">
          <div class="modal-box max-w-md min-h-[50vh] text-left relative" @click.stop>
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="showSettings = false">✕</button>
            
            <h3 class="font-bold text-lg mb-4">TTS 설정</h3>
            
            <div class="form-control w-full mb-4">
              <label class="label">
                <span class="label-text">목소리 선택</span>
              </label>
              <select class="select select-bordered" v-model="selectedVoiceURI">
                <option v-for="voice in availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">
                  {{ voice.name }}
                </option>
              </select>
            </div>

            <div class="form-control w-full mb-4">
              <label class="label">
                <span class="label-text">속도 (Rate): {{ rate }}</span>
              </label>
              <input type="range" min="0.5" max="2" step="0.1" v-model.number="rate" class="range range-xs" />
            </div>

            <div class="form-control w-full mb-6">
              <label class="label">
                <span class="label-text">피치 (Pitch): {{ pitch }}</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1" v-model.number="pitch" class="range range-xs" />
            </div>

            <div class="modal-action">
               <button class="btn" @click="showSettings = false">닫기</button>
            </div>
          </div>
        </div>
      </Teleport>

      <div class="text-3xl mb-8 leading-snug text-base-content break-words whitespace-normal font-bold">
        <template v-for="(word, index) in words" :key="index">
          <span
            :class="[
              'cursor-pointer transition-colors duration-200 hover:underline font-bold',
              index <= currentIndex ? 'text-success' : ''
            ]"
            @click="handleWordClick(index)"
          >{{ word }}</span>
          <span>{{ ' ' }}</span>
        </template>
      </div>
      <div class="flex justify-center gap-4">
        <button @click="togglePlay" class="btn btn-success text-white px-8 text-lg">
          {{ isPlaying ? 'STOP' : 'TTS PLAY' }}
        </button>
        <button @click="$emit('next')" class="btn btn-info text-white px-8 text-lg">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, onMounted } from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  lang: {
    type: String,
    default: 'en-US',
  },
});

const emit = defineEmits(['close', 'next']);

// --- State ---
const isPlaying = ref(false);
const currentIndex = ref(-1);
const isMeasuring = ref(false);

const synth = window.speechSynthesis;
let utterance = null;
let animationFrameId = null;

// Settings
const showSettings = ref(false);
const availableVoices = ref([]);
const selectedVoiceURI = ref('');
const rate = ref(1.0);
const pitch = ref(1.0);
let voiceList = [];

// Cache: { "text_rate": durationMs }
const durationCache = ref({});

// Timing logic
let startTime = 0; // Playback start time (Date.now())
let expectedDuration = 0; // Total duration if playing from start (from cache)

// --- Initialization ---

const updateVoices = () => {
  voiceList = synth.getVoices();
  const targetLang = props.lang;
  // Match language or lang group
  availableVoices.value = voiceList.filter(v => 
    v.lang.includes(targetLang) || v.lang.includes(targetLang.split('-')[0])
  );
  
  if (availableVoices.value.length > 0) {
    const currentValid = availableVoices.value.find(v => v.voiceURI === selectedVoiceURI.value);
    if (!currentValid) {
       // Prefer Google or Microsoft
       const preferred = availableVoices.value.find(v => v.name.includes('Google') || v.name.includes('Microsoft')) || availableVoices.value[0];
       selectedVoiceURI.value = preferred.voiceURI;
    }
  }
};

onMounted(() => {
  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
});

watch(() => props.lang, () => {
  updateVoices();
  stop();
});

watch(() => props.text, () => {
  stop();
  currentIndex.value = -1;
});

// Words Splitting
const words = computed(() => {
  const t = props.text.trim();
  if (!t) return [];
  return t.split(/\s+/);
});

// Cache Helpers
const getCacheKey = () => `${props.text}_${rate.value}`;
const getCachedDuration = () => durationCache.value[getCacheKey()];
const setCachedDuration = (dur) => { 
    console.log(`[SentenceTTS2] Caching duration for key "${getCacheKey()}": ${dur}ms`);
    durationCache.value[getCacheKey()] = dur; 
};

// --- Playback Logic ---

const stop = () => {
  if (synth.speaking || synth.pending) {
    synth.cancel();
  }
  isPlaying.value = false;
  
  // Important: If we were measuring and user stopped manually, we do NOT save.
  // We clear 'isMeasuring' so onend logic knows it wasn't a clean finish.
  isMeasuring.value = false;
  
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  currentIndex.value = -1;
  utterance = null;
};

const play = (startIndex = 0) => {
  stop(); // Reset state

  const textToPlay = words.value.slice(startIndex).join(' ');
  if (!textToPlay) return;

  utterance = new SpeechSynthesisUtterance(textToPlay);
  utterance.lang = props.lang;

  const selectedVoice = voiceList.find(v => v.voiceURI === selectedVoiceURI.value);
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = rate.value;
  utterance.pitch = pitch.value;

  const cachedDur = getCachedDuration();
  
  // Measurement Logic
  // Only measure when playing from START (index 0) and we have no cache (or if rate changed context calls for it)
  if (startIndex === 0 && !cachedDur) {
      isMeasuring.value = true;
      expectedDuration = 0;
  } else {
      isMeasuring.value = false;
      expectedDuration = cachedDur || 0; // If index > 0 but no cache, we just play without precise highlighting
  }

  // Hook for measurement start/end capture
  let measureStartTime = 0;

  utterance.onstart = () => {
    isPlaying.value = true;
    measureStartTime = Date.now();
    
    // Animation Setup
    if (!isMeasuring.value && expectedDuration > 0) {
      // Logic to determine "Virtual Start Time" relative to the whole sentence
      const fullTextLen = props.text.length;
      
      // Calculate start proportion
      const preText = words.value.slice(0, startIndex).join(' ');
      const preLen = startIndex > 0 ? preText.length + 1 : 0;
      
      const startProgressRatio = preLen / fullTextLen;
      const timeAlreadyElapsed = expectedDuration * startProgressRatio;
      
      startTime = Date.now() - timeAlreadyElapsed;
      
      startAnimationLoop();
    } else {
        // If measuring, or no duration known (partial play without cache), 
        // we cannot animate accurately.
        // Option: Show nothing, or highlight start index
        currentIndex.value = startIndex > 0 ? startIndex - 1 : -1;
    }
  };

  utterance.onend = () => {
    // Check if we should save the measurement
    // Conditions: Was Measuring + Ended Naturally (isPlaying is still true)
    if (isMeasuring.value && isPlaying.value) {
        const duration = Date.now() - measureStartTime;
        if (duration > 100) { // arbitrary threshold to filter errors
            setCachedDuration(duration);
        }
    }
    
    isPlaying.value = false;
    isMeasuring.value = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    currentIndex.value = words.value.length; // Highlight all at end
  };

  utterance.onerror = (e) => {
    console.error('TTS Error:', e);
    stop();
  };

  synth.speak(utterance);
};


const startAnimationLoop = () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    // Total text length (including spaces roughly)
    const fullTextLen = props.text.length;
    
    const animate = () => {
        if (!isPlaying.value) return;

        const now = Date.now();
        const elapsed = now - startTime; // Virtual elapsed
        
        // Progress 0.0 ~ 1.0
        let progress = elapsed / expectedDuration;
        if (progress > 1.0) progress = 1.0;
        
        // Map to character index
        const estimatedCharIndex = Math.floor(progress * fullTextLen);
        
        // Find corresponding word index
        let charCount = 0;
        let foundIndex = words.value.length - 1;
        
        for (let i = 0; i < words.value.length; i++) {
            const wLen = words.value[i].length;
            const endChar = charCount + wLen; // End of this word
            
            if (estimatedCharIndex < endChar) {
                foundIndex = i;
                break;
            }
            
            charCount += wLen + 1; // +1 for the space following the word
        }
        
        currentIndex.value = foundIndex;

        if (progress < 1.0) {
            animationFrameId = requestAnimationFrame(animate);
        }
    };
    
    animate();
};

const togglePlay = () => {
  if (isPlaying.value) {
    stop();
  } else {
    play(0);
  }
};

const handleWordClick = (index) => {
  play(index);
};

onUnmounted(() => {
  stop();
});
</script>

<style scoped>
/* DaisyUI handles most styles */
</style>
