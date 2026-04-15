import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client'
import App from './app'
import './index.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// 👇 IMPORTA O TEMA
import { ThemeProvider } from './theme/ThemeContext'
import { initDatadogBrowserRum } from './lib/datadogRumInit'

initDatadogBrowserRum()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <ToastContainer
        position="top-right"
        theme="dark"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ThemeProvider>
  </StrictMode>,
)