import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthBootstrap } from '@/app/providers/AuthBootstrap'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { AppRouter } from '@/app/router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <AuthBootstrap>
        <AppRouter />
      </AuthBootstrap>
    </QueryProvider>
  </StrictMode>,
)
