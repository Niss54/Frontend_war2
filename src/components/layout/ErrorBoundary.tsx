import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          background: '#12121a',
          color: '#8b92a5',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #1e1e2e',
          gap: '16px'
        }}>
          <AlertTriangle size={48} color="#FF3366" />
          <h2 style={{ color: '#fff', margin: 0 }}>Panel Temporarily Unavailable</h2>
          <p style={{ margin: 0, textAlign: 'center' }}>
            {this.props.fallbackMessage || 'The operation module encountered an unexpected error.'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 16px',
              background: '#4A9EFF20',
              border: '1px solid #4A9EFF',
              color: '#4A9EFF',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '12px'
            }}
          >
            Retry Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
