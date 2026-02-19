import React from 'react';

import { BackgroundDecor } from '../components/layout/BackgroundDecor';
import { PasskeyButton } from '../components/layout/PasskeyButton';
import { NavigationTabs, ViewMode } from '../components/navigation/NavigationTabs';
import { PasskeyManagement } from '../features/auth/PasskeyManagement';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { Language, translations } from '../i18n';

import { ContentView } from './ContentView';

type MainAppContentProps = {
  state: ReturnType<typeof usePracticeSession>['state'];
  derived: ReturnType<typeof usePracticeSession>['derived'];
  actions: ReturnType<typeof usePracticeSession>['actions'];
  pressedKeys: ReturnType<typeof usePracticeSession>['pressedKeys'];
  t: typeof translations.en;
  toggleLang: () => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatHistory: Array<{ role: 'user' | 'ai'; text: string; hasAction?: boolean }>;
  isLoadingAi: boolean;
  sendMessage: (message: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  lang: Language;
  showPasskeyManagement: boolean;
  setShowPasskeyManagement: (show: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedSongId: string | null;
  setSelectedSongId: (id: string | null) => void;
  showSongComplete: boolean;
  setShowSongComplete: (show: boolean) => void;
};

export const MainAppContent: React.FC<MainAppContentProps> = (props) => {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    const forceErrorBoundary = new URLSearchParams(window.location.search).get(
      '__forceErrorBoundary'
    );
    if (forceErrorBoundary === '1') {
      throw new Error('E2E forced child render error');
    }
  }

  return (
    <>
      <BackgroundDecor />
      <PasskeyButton onClick={() => props.setShowPasskeyManagement(true)} />
      {props.showPasskeyManagement && (
        <PasskeyManagement onClose={() => props.setShowPasskeyManagement(false)} />
      )}
      {props.viewMode !== 'song-practice' && (
        <NavigationTabs viewMode={props.viewMode} setViewMode={props.setViewMode} t={props.t} />
      )}
      <ContentView {...props} />
    </>
  );
};
