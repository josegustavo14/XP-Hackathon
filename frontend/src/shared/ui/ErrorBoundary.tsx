import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="global-error" role="alert"><h1>Algo deu errado</h1><p>Não foi possível renderizar esta tela.</p><button onClick={() => window.location.reload()}>Recarregar</button></div>;
  }
}
