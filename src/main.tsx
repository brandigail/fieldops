import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { FieldDataProvider } from './providers/FieldDataProvider'
import { ThemeProvider } from './providers/ThemeProvider'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <FieldDataProvider>
        <App />
      </FieldDataProvider>
    </ThemeProvider>
  </StrictMode>,
)
