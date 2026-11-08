/** Optional public link to your fork's source code. Set VITE_REPO_URL at build time; hidden when empty. */
export const REPO_URL: string = (import.meta.env.VITE_REPO_URL as string | undefined)?.trim() ?? ''
