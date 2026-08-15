import { type ReactNode } from 'react';

interface AuthScreenLayoutProps {
  children: ReactNode;
  dataTestId?: string;
}

export function AuthScreenLayout({ children, dataTestId }: AuthScreenLayoutProps) {
  return (
    <div
      data-testid={dataTestId}
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundImage:
          'linear-gradient(to bottom right, var(--color-bg-auth-from), var(--color-bg-auth-to))',
      }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
