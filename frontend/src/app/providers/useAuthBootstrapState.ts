import { useContext } from 'react'
import { AuthBootstrapContext } from '@/app/providers/AuthBootstrapContext'

export function useAuthBootstrapState() {
  return useContext(AuthBootstrapContext)
}
