import { Component, ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Frontend error boundary', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="page-stack">
          <Card>
            <div className="empty-state">
              <h3>Er is iets misgegaan</h3>
              <p>{this.state.error.message}</p>
              <Button onClick={() => window.location.reload()}>Pagina opnieuw laden</Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
