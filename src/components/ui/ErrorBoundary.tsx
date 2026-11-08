import { Component, type ReactNode } from 'react'

/** Catches render errors in the 3D layer so a GPU / driver failure degrades to lite mode instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode; onError: () => void; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('[festiverse] 3D layer failed, switching to lite mode', error)
    this.props.onError()
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
