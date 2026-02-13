import { KeyRound } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import AiCoachPanel from './features/ai/AiCoachPanel';
import { AuthGate } from './features/auth/AuthGate';
import { AuthProvider } from './features/auth/AuthProvider';
import { InviteRegister } from './features/auth/InviteRegister';
import { PasskeyManagement } from './features/auth/PasskeyManagement';
import TopBar from './features/controls/TopBar';
import PracticeArea from './features/practice/PracticeArea';
import { useAiCoach } from './hooks/useAiCoach';
import { usePracticeSession } from './hooks/usePracticeSession';
import { useTestAPI } from './hooks/useTestAPI';
import { translations } from './i18n';
import { useUiStore } from './store/uiStore';

function BackgroundDecor() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
    </div>
  );
}

function PasskeyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 z-50 rounded-lg bg-slate-800/50 p-2 text-slate-400 backdrop-blur-sm transition-colors hover:bg-slate-700 hover:text-indigo-400"
      title="Manage Passkeys"
    >
      <KeyRound className="h-5 w-5" />
    </button>
  );
}

function InvitePage({ token }: { token: string }) {
  return (
    <AuthProvider>
      <InviteRegister token={token} onSuccess={() => (window.location.href = '/')} />
    </AuthProvider>
  );
}

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
  showPasskeyManagement: boolean;
  setShowPasskeyManagement: (show: boolean) => void;
};

const MainAppContent: React.FC<MainAppContentProps> = ({
  state,
  derived,
  actions,
  pressedKeys,
  t,
  toggleLang,
  chatInput,
  setChatInput,
  chatHistory,
  isLoadingAi,
  sendMessage,
  chatEndRef,
  showPasskeyManagement,
  setShowPasskeyManagement,
}) => (
  <>
    <BackgroundDecor />
    <PasskeyButton onClick={() => setShowPasskeyManagement(true)} />
    {showPasskeyManagement && <PasskeyManagement onClose={() => setShowPasskeyManagement(false)} />}
    <TopBar
      isListening={state.isListening}
      clef={state.clef}
      score={state.score}
      bpm={state.sessionStats.bpm}
      accuracy={derived.accuracy}
      onToggleMic={actions.toggleMic}
      onToggleClef={actions.toggleClef}
      onToggleLang={toggleLang}
      onResetStats={actions.resetSessionStats}
      t={t}
    />
    <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-3">
      <PracticeArea
        clef={state.clef}
        practiceRange={state.practiceRange}
        handMode={state.handMode}
        noteQueue={state.noteQueue}
        exitingNotes={state.exitingNotes}
        detectedNote={state.detectedNote}
        status={state.status}
        targetNote={derived.targetNote}
        pressedKeys={pressedKeys}
        challengeSequence={state.challengeSequence}
        challengeIndex={state.challengeIndex}
        challengeInfo={state.challengeInfo}
        t={t}
        isMidiConnected={state.isMidiConnected}
        onPracticeRangeChange={actions.setPracticeRange}
        onHandModeChange={actions.setHandMode}
      />
      <AiCoachPanel
        clef={state.clef}
        targetNote={derived.targetNote}
        t={t}
        chatHistory={chatHistory}
        chatInput={chatInput}
        isLoadingAi={isLoadingAi}
        onChatInputChange={setChatInput}
        onSendMessage={sendMessage}
        chatEndRef={chatEndRef}
      />
    </main>
  </>
);

const MainApp = () => {
  const lang = useUiStore((state) => state.lang);
  const toggleLang = useUiStore((state) => state.toggleLang);
  const t = translations[lang];
  const [showPasskeyManagement, setShowPasskeyManagement] = useState(false);
  const challengeCompleteRef = useRef<() => void>(() => {});

  const practiceSession = usePracticeSession({
    onMicError: () => alert(t.micError),
    onChallengeComplete: () => challengeCompleteRef.current(),
  });

  const { state, derived, actions, pressedKeys } = practiceSession;
  useTestAPI(practiceSession);

  const { chatInput, setChatInput, chatHistory, isLoadingAi, sendMessage, chatEndRef } = useAiCoach(
    {
      clef: state.clef,
      lang,
      onLoadChallenge: actions.loadChallenge,
    }
  );

  useEffect(() => {
    challengeCompleteRef.current = () => {
      sendMessage('I finished the challenge! How did I do?');
    };
  }, [sendMessage]);

  return (
    <AuthGate>
      <div
        className="bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100"
        style={{ minHeight: '100dvh' }}
      >
        <MainAppContent
          state={state}
          derived={derived}
          actions={actions}
          pressedKeys={pressedKeys}
          t={t}
          toggleLang={toggleLang}
          chatInput={chatInput}
          setChatInput={setChatInput}
          chatHistory={chatHistory}
          isLoadingAi={isLoadingAi}
          sendMessage={sendMessage}
          chatEndRef={chatEndRef}
          showPasskeyManagement={showPasskeyManagement}
          setShowPasskeyManagement={setShowPasskeyManagement}
        />
      </div>
    </AuthGate>
  );
};

const App = () => {
  const inviteToken = new URLSearchParams(window.location.search).get('token');
  if (window.location.pathname === '/invite' && inviteToken) {
    return <InvitePage token={inviteToken} />;
  }
  return <MainApp />;
};

export default App;
