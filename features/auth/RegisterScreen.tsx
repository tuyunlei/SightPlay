import { AuthScreenLayout } from './AuthScreenLayout';
import { RegisterCard } from './RegisterCard';

interface RegisterScreenProps {
  initialInviteCode?: string;
  onReturnToLogin?: () => void;
}

export function RegisterScreen({ initialInviteCode, onReturnToLogin }: RegisterScreenProps) {
  return (
    <AuthScreenLayout>
      <RegisterCard
        dataTestId="register-screen"
        initialInviteCode={initialInviteCode}
        onReturnToLogin={onReturnToLogin}
      />
    </AuthScreenLayout>
  );
}
