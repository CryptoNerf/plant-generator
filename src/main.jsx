import React from 'react'
import ReactDOM from 'react-dom/client'
import App from "./App.jsx";
import './index.css'
import { Analytics } from '@vercel/analytics/react' // Импорт компонента аналитики
import { registerSW } from 'virtual:pwa-register'

// Регистрация Service Worker для PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Доступна новая версия приложения. Обновить?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('Приложение готово к работе офлайн')
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Analytics /> {/* Добавляем компонент аналитики */}
    <App />
  </React.StrictMode>,
)