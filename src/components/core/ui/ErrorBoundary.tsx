import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in panel:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#12121A',
          border: '1px dashed rgba(255, 184, 0, 0.4)',
          borderRadius: '8px',
          padding: '24px',
          color: '#8b92a5',
          fontFamily: '"Courier New", Courier, monospace'
        }}>
          <div style={{ color: '#FFB800', fontWeight: 'bold', marginBottom: '16px' }}>
            ■■ {this.props.fallbackName || 'Panel'} temporarily unavailable
          </div>
          <button 
            onClick={this.handleRetry}
            style={{
              background: 'transparent',
              border: '1px solid #1E1E2E',
              color: '#8b92a5',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: '"Courier New", Courier, monospace'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#333';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#8b92a5';
              e.currentTarget.style.borderColor = '#1E1E2E';
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
