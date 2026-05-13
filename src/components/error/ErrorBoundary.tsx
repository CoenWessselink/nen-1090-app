import { Component, ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { ApiError } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { captureClientException } from '@/lib/sentry';

type State = {
  error: Error | null;
  requestId: string | null;
};

function readRequestId(error: Error | null): string | null {
  if (!error) return null;
  if (error instanceof ApiError && error.requestId) return error.requestId;
  return null;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  override state: State = { error: null, requestId: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, requestId: readRequestId(error) };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Frontend error boundary', error, errorInfo);
    void captureClientException(error, { componentStack: errorInfo.componentStack });
  }

  override render(): ReactNode {
    if (this.state.error) {
      const rid = this.state.requestId;
      return (
        <div className="page-stack">
          <Card>
            <div className="empty-state">
              <h3>Er is iets misgegaan</h3>
              <p>{this.state.error.message}</p>
              {rid ? (
                <p className="list-subtle" style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace' }}>
                  Referentie: {rid}
                  <Button
                    variant="secondary"
                    style={{ marginLeft: 8 }}
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(rid).catch(() => undefined)}
                  >
                    Kopiëren
                  </Button>
                </p>
              ) : null}
              <Button onClick={() => window.location.reload()}>Pagina opnieuw laden</Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
