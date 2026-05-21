import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Qualcosa è andato storto</h2>
          <p className="text-muted" style={{ marginBottom: '2rem' }}>
            Si è verificato un errore inatteso. Prova a ricaricare l'app.
          </p>
          <button
            className="btn btn-primary"
            style={{ maxWidth: 280, margin: '0 auto' }}
            onClick={() => window.location.reload()}
          >
            Ricarica app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
