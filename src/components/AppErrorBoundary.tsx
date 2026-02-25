import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('App crashed, redirecting to /login', error);
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
          Redirecting to sign in...
        </div>
      );
    }

    return this.props.children;
  }
}

