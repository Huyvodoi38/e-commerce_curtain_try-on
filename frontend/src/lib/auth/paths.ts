export function loginPathWithRedirect(returnTo: string): string {
  return `/login?redirect=${encodeURIComponent(returnTo)}`
}
