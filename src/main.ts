import {createApp} from 'vue'
import "./style.css";
import "primeicons/primeicons.css";
import App from "./App.vue";
import PrimeVue from "primevue/config";
import "primevue/resources/themes/aura-dark-green/theme.css";
import Tooltip from "primevue/tooltip";

const app = createApp(App)
app.directive("tooltip", Tooltip);
app.use(PrimeVue, {});
app.mount("#app");
