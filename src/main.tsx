import { Component, StrictMode } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('The salon could not render:', error, info) }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>A little tangle!</h1><p>The salon could not open. Please reload to try again. Your saved gallery has not been deleted.</p><button className="primary-button" onClick={() => location.reload()}>Try again</button></main>
    return this.props.children
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('The application root is missing.')
createRoot(root).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>)
