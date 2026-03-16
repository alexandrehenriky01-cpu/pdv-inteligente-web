import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.tsx'
import './index.css' // Aqui importamos o Tailwind!

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)