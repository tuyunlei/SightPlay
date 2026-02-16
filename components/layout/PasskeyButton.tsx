import { KeyRound } from 'lucide-react';

import { useLanguage } from '../../hooks/useLanguage';

type PasskeyButtonProps = {
  onClick: () => void;
};

export function PasskeyButton({ onClick }: PasskeyButtonProps) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 z-50 rounded-lg bg-slate-800/50 p-2 text-slate-400 backdrop-blur-sm transition-colors hover:bg-slate-700 hover:text-indigo-400"
      title={t.passkeyButtonTitle}
    >
      <KeyRound className="h-5 w-5" />
    </button>
  );
}
