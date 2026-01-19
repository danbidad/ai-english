<script setup>
import { ref } from 'vue';
import SentenceTTS from '../components/SentenceTTS.vue';
import SentenceTTS2 from '../components/SentenceTTS2.vue';

const sentences = [
  {
    text: "Hello, this is the first sample sentence for TTS testing. Click on any word to start playing from that position.",
    lang: "en-US"
  },
  {
    text: "Here is a second sentence to demonstrate switching between different texts dynamically.",
    lang: "en-US"
  },
  {
    text: "안녕하세요, 이것은 한국어 문장입니다. 언어 설정이 제대로 작동하는지 확인해 보세요.",
    lang: "ko-KR"
  }
];

const currentIdx = ref(0);
const isVisible = ref(false);
const useType2 = ref(false);

const openSentence = (index, type2 = false) => {
  currentIdx.value = index;
  useType2.value = type2;
  isVisible.value = true;
};

const handleNext = () => {
  currentIdx.value = (currentIdx.value + 1) % sentences.length;
};

const handleClose = () => {
  isVisible.value = false;
};
</script>

<template>
  <div class="app-container">
    <h1>Sentence TTS Demo</h1>
    <div class="buttons mb-4">
      <h3>Normal TTS (Boundary Event)</h3>
      <button @click="openSentence(0)">Sentence 1 (English)</button>
      <button @click="openSentence(1)">Sentence 2 (English)</button>
      <button @click="openSentence(2)">Sentence 3 (Korean)</button>
    </div>

    <div class="buttons">
      <h3>Sequential TTS (Word by Word)</h3>
      <button @click="openSentence(0, true)">Sentence 1 (English)</button>
      <button @click="openSentence(1, true)">Sentence 2 (English)</button>
      <button @click="openSentence(2, true)">Sentence 3 (Korean)</button>
    </div>

    <component 
      v-if="isVisible"
      :is="useType2 ? SentenceTTS2 : SentenceTTS"
      :text="sentences[currentIdx].text"
      :lang="sentences[currentIdx].lang" 
      @close="handleClose"
      @next="handleNext"
    />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
</style>
