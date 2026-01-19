<template>
  <div class="modal modal-open">
    <div class="modal-box max-w-[80%] text-center">
      <button class="btn btn-sm btn-circle btn-ghost absolute left-2 top-2" @click="showSettings = true">⚙️</button>
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="$emit('close')">✕</button>
      
      <!-- Settings Modal -->
      <!-- Settings Modal -->
      <!-- Settings Modal -->
      <!-- Settings Modal -->
      <Teleport to="body">
        <div v-if="showSettings" class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50" @click="showSettings = false">
          <div class="modal-box max-w-md min-h-[50vh] text-left relative" @click.stop>
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="showSettings = false">✕</button>
            
            <h3 class="font-bold text-lg mb-4">TTS Settings</h3>
            
            <div class="form-control w-full mb-4">
              <label class="label">
                <span class="label-text">Select Voice</span>
              </label>
              <select class="select select-bordered" v-model="selectedVoiceURI">
                <option v-for="voice in availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">
                  {{ voice.name }}
                </option>
              </select>
            </div>

            <div class="form-control w-full mb-4">
              <label class="label">
                <span class="label-text">Speed (Rate): {{ rate }}</span>
              </label>
              <input type="range" min="0.5" max="2" step="0.1" v-model.number="rate" class="range range-xs" />
            </div>

            <div class="form-control w-full mb-6">
              <label class="label">
                <span class="label-text">Pitch: {{ pitch }}</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1" v-model.number="pitch" class="range range-xs" />
            </div>

            <div class="modal-action">
               <button class="btn" @click="showSettings = false">Close</button>
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

const isPlaying = ref(false);
const currentIndex = ref(-1);
let utterance = null;
const synth = window.speechSynthesis;

// Settings State
const showSettings = ref(false);
const availableVoices = ref([]);
const selectedVoiceURI = ref('');
const rate = ref(1);
const pitch = ref(1);
let voiceList = [];

const updateVoices = () => {
  voiceList = synth.getVoices();
  // 현재 언어와 매칭되는 목소리 필터링 (en-US 등)
  // 정확한 매칭이 없으면 언어 코드 앞부분(en)만이라도 매칭 시도
  const targetLang = props.lang;
  availableVoices.value = voiceList.filter(v => v.lang.includes(targetLang) || v.lang.includes(targetLang.split('-')[0]));
  
  // 기본 선택: 목소리가 있고 현재 선택된 게 없거나 유효하지 않으면 첫 번째 선택
  if (availableVoices.value.length > 0) {
    const currentValid = availableVoices.value.find(v => v.voiceURI === selectedVoiceURI.value);
    if (!currentValid) {
      selectedVoiceURI.value = availableVoices.value[0].voiceURI;
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
  // 언어가 바뀌면 음성 목록 갱신
  updateVoices();
  stop(); // 언어 바뀌면 재생 중지
});

// 문장을 단어 단위로 분리 (공백 기준)
const words = computed(() => {
  return props.text.trim().split(/\s+/);
});

watch(() => props.text, () => {
  stop();
});

const stop = () => {
  if (synth.speaking) {
    synth.cancel();
  }
  isPlaying.value = false;
  currentIndex.value = -1;
  utterance = null;
};

const play = (startIndex = 0) => {
  stop();

  // 요구사항: "문장의 해당 위치에서부터 문장끝까지 TTS를 다시 시작"
  const textToPlay = words.value.slice(startIndex).join(' ');
  if (!textToPlay) return; // 재생할 텍스트가 없으면 리턴

  utterance = new SpeechSynthesisUtterance(textToPlay);
  utterance.lang = props.lang;
  
  // Apply Settings
  const selectedVoice = voiceList.find(v => v.voiceURI === selectedVoiceURI.value);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = rate.value;
  utterance.pitch = pitch.value;

  utterance.onstart = () => {
    isPlaying.value = true;
    currentIndex.value = startIndex;
  };

  utterance.onend = () => {
    isPlaying.value = false;
    currentIndex.value = words.value.length; // 끝까지 다 읽음
  };

  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      // event.charIndex는 textToPlay 기준임.
      const spokenTextSoFar = textToPlay.substring(0, event.charIndex);
      
      // 현재 부분 텍스트의 단어 개수 계산
      // 예: "Hello world" -> "Hello " (charIndex 6) -> split -> ["Hello", ""] -> length 2? 
      // trim()을 하면 "Hello" -> length 1.
      // 공백을 기준으로 확실하게 나눔.
      const tokens = spokenTextSoFar.trim().split(/\s+/);
      let relativeIndex = tokens.length;
      
      // spokenTextSoFar가 빈 문자열이면 tokens=[''] (length 1)이 될 수 있음.
      if (spokenTextSoFar.trim() === '') {
        relativeIndex = 0;
      } else {
        // 단어 중간에 이벤트가 발생할 수도 있음 (보통 단어 시작점)
        // 만약 공백 직후라면 다음 단어 시작임.
        // 여기서는 대략적으로 계산.
      }

      currentIndex.value = startIndex + relativeIndex;
      
      // 버그 수정: 첫 단어(charIndex=0)일 때 relativeIndex가 0이어야 함.
      if (event.charIndex === 0) {
        currentIndex.value = startIndex;
      }
    } else {
          console.log(event);
    }
  };

  // 에러 처리 추가
  utterance.onerror = (event) => {
    console.error('TTS Error:', event);
    isPlaying.value = false;
  };

  synth.speak(utterance);
};

const togglePlay = () => {
  if (isPlaying.value) {
    stop();
  } else {
    // 처음부터 재생
    currentIndex.value = 0;
    play(0);
  }
};

const handleWordClick = (index) => {
  // 클릭한 위치부터 재생
  play(index);
};

onUnmounted(() => {
  stop();
});
</script>
