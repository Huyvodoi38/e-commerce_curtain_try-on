const SESSION_HINT_KEY = 'curtain_has_session'

export function markHasSession(): void {
  localStorage.setItem(SESSION_HINT_KEY, '1')
}

export function clearSessionHint(): void {
  localStorage.removeItem(SESSION_HINT_KEY)
}

export function hasSessionHint(): boolean {
  return localStorage.getItem(SESSION_HINT_KEY) === '1'
}
