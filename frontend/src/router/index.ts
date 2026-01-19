import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const Home = () => import('../views/HomeView.vue')
const YouTubeSearch = () => import('../views/YouTubeSearchView.vue')
const YouTubePlayer = () => import('../views/YouTubePlayerView.vue')
const Sentence = () => import('../views/SentenceTestView.vue')
const TTS = () => import('../views/TTSTestView.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/youtube', name: 'youtube', component: YouTubeSearch },
  { path: '/youtube/:videoId', name: 'youtubePlayer', component: YouTubePlayer, props: true },
  { path: '/sentence', name: 'sentence', component: Sentence },
  { path: '/tts', name: 'tts', component: TTS },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
