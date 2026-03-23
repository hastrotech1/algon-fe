import React from "react";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Unhandled render error:", error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): React.ReactNode {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 to-white px-4">
          <div className="max-w-md w-full bg-white border rounded-xl shadow-sm p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while rendering this page.
            </p>
            <Button onClick={this.handleReload} className="rounded-lg w-full">
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}
