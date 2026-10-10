export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return <p role="status" className="state">{label}</p>;
}

export function EmptyState({ message = 'Nenhum registro encontrado.' }: { message?: string }) {
  return <p className="state">{message}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="state state-error">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}
