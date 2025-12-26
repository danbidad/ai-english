import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const Home = () => import('../views/Home.vue')
const YouTubeSearch = () => import('../views/YouTubeSearch.vue')
const YouTubePlayer = () => import('../views/YouTubePlayer.vue')
const Sentence = () => import('../views/Sentence.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/youtube', name: 'youtube', component: YouTubeSearch },
  { path: '/youtube/:videoId', name: 'youtubePlayer', component: YouTubePlayer, props: true },
  { path: '/sentence', name: 'sentence', component: Sentence },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
