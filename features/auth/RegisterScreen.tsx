import { RegisterCard } from './RegisterCard';

interface RegisterScreenProps {
  initialInviteCode?: string;
}

export function RegisterScreen({ initialInviteCode }: RegisterScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <RegisterCard dataTestId="register-screen" initialInviteCode={initialInviteCode} />
    </div>
  );
}
