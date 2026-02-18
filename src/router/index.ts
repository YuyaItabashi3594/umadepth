import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/motivation',
      name: 'motivation',
      component: () => import('../views/MotivationView.vue'),
    },
    {
      path: '/chanmi',
      name: 'chanmi',
      component: () => import(`../views/ChanmiView.vue`),
    },
    {
      path: '/chanmi/:slug',
      name: 'chanmi_wrapper',
      component: () => import(`../views/ChanmiWrapper.vue`)
    },
    {
      path: '/gacha',
      name: 'gacha',
      component: () => import('../views/GachaView.vue'),
    }

  ],
})

export default router
