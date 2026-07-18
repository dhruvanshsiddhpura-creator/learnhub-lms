import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="glass-panel p-8 rounded-2xl border border-red-500/20 max-w-lg text-center animate-fade-in">
            <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-400 mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong.</h2>
            <p className="text-sm text-dark-300 mb-6">
              We encountered an unexpected error while trying to render this component. 
              Our engineers have been notified.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-sm transition-colors border border-red-500/30"
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
               <details className="mt-4 text-left p-4 bg-dark-950 rounded-lg text-xs text-red-200 overflow-auto border border-red-900/50">
                <summary className="cursor-pointer font-bold mb-2">Error Details</summary>
                <pre>{this.state.error && this.state.error.toString()}</pre>
                <br />
                <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
