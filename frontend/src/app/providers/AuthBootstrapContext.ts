import { createContext } from 'react'

export type AuthBootstrapState = {
  isBootstrapping: boolean
}

export const AuthBootstrapContext = createContext<AuthBootstrapState>({
  isBootstrapping: true,
})
