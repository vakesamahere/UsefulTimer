import { createApp } from 'vue'
import App from './App.vue'
import './styles/theme.css'
import './styles/_base.css'
import helperTooltip from './utils/helperTooltip'

window.variables = {
  helperTaskId: 0
}
window.config = {
  helperTimeout: 3000
}

const app = createApp(App)
app.directive('tooltip', helperTooltip)
app.mount('#app')
