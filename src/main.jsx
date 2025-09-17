import React from 'react'
import ReactDOM from 'react-dom/client'
import App from "./App.jsx";
import './index.css'
import { Analytics } from '@vercel/analytics/react' // Импорт компонента аналитики

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Analytics /> {/* Добавляем компонент аналитики */}
    <App />
  </React.StrictMode>,
)