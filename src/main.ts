import {createApp} from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import 'primevue/resources/themes/aura-light-green/theme.css'

const app = createApp(App)
app.use(PrimeVue,{ripple: true})
app.mount('#app')