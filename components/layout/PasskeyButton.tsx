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
      className="fixed top-4 right-4 z-50 rounded-lg bg-white/70 p-2 text-slate-500 backdrop-blur-sm transition-colors hover:bg-white hover:text-indigo-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
      title={t.passkeyButtonTitle}
    >
      <KeyRound className="h-5 w-5" />
    </button>
  );
}
