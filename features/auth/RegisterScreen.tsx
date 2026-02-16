import { RegisterCard } from './RegisterCard';

interface RegisterScreenProps {
  initialInviteCode?: string;
}

export function RegisterScreen({ initialInviteCode }: RegisterScreenProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        backgroundImage:
          'linear-gradient(to bottom right, var(--color-bg-auth-from), var(--color-bg-auth-to))',
      }}
    >
      <RegisterCard dataTestId="register-screen" initialInviteCode={initialInviteCode} />
    </div>
  );
}
