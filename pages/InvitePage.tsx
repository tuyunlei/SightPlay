import { AuthProvider } from '../features/auth/AuthProvider';
import { InviteRegister } from '../features/auth/InviteRegister';

type InvitePageProps = {
  token: string;
};

export function InvitePage({ token }: InvitePageProps) {
  return (
    <AuthProvider>
      <InviteRegister token={token} onSuccess={() => (window.location.href = '/')} />
    </AuthProvider>
  );
}
