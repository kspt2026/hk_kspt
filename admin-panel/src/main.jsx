// MIGRATION NOTE: HeroUI v3 has no HeroUIProvider (RAC-based components work without
// a provider). Render logic unchanged from original.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
