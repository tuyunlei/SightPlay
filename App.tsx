import { KeyRound, Library, Music } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { getSongById } from './data/songs';
import { computeAccuracy } from './domain/scoring';
import AiCoachPanel from './features/ai/AiCoachPanel';
import { AuthGate } from './features/auth/AuthGate';
import { AuthProvider } from './features/auth/AuthProvider';
import { InviteRegister } from './features/auth/InviteRegister';
import { PasskeyManagement } from './features/auth/PasskeyManagement';
import TopBar from './features/controls/TopBar';
import { SongComplete } from './features/library/SongComplete';
import { SongLibrary } from './features/library/SongLibrary';
import { SongPractice } from './features/library/SongPractice';
import PracticeArea from './features/practice/PracticeArea';
import { useAiCoach } from './hooks/useAiCoach';
import { usePracticeSession } from './hooks/usePracticeSession';
import { useTestAPI } from './hooks/useTestAPI';
import { translations } from './i18n';
import { usePracticeStore } from './store/practiceStore';
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

type ViewMode = 'random' | 'library' | 'song-practice';

type NavigationTabsProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  t: typeof translations.en;
};

const NavigationTabs: React.FC<NavigationTabsProps> = ({ viewMode, setViewMode, t }) => (
  <div className="relative z-20 w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
    <div className="max-w-7xl mx-auto px-4 py-3">
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('random')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'random'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <Music size={18} />
          {t.randomPractice}
        </button>
        <button
          onClick={() => setViewMode('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'library'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <Library size={18} />
          {t.songLibrary}
        </button>
      </div>
    </div>
  </div>
);

type RandomPracticeViewProps = {
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
};

const RandomPracticeView: React.FC<RandomPracticeViewProps> = ({
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
}) => (
  <>
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
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedSongId: string | null;
  setSelectedSongId: (id: string | null) => void;
  showSongComplete: boolean;
  setShowSongComplete: (show: boolean) => void;
};

type ContentViewProps = {
  viewMode: ViewMode;
  selectedSongId: string | null;
  showSongComplete: boolean;
  setSelectedSongId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowSongComplete: (show: boolean) => void;
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
};

const ContentView: React.FC<ContentViewProps> = ({
  viewMode,
  selectedSongId,
  showSongComplete,
  setSelectedSongId,
  setViewMode,
  setShowSongComplete,
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
}) => {
  const sessionStats = usePracticeStore((s) => s.sessionStats);
  const songStartTime = usePracticeStore((s) => s.songStartTime);

  if (viewMode === 'library') {
    return (
      <SongLibrary
        onSongSelect={(songId) => {
          setSelectedSongId(songId);
          setViewMode('song-practice');
        }}
      />
    );
  }

  if (viewMode === 'song-practice' && selectedSongId) {
    return (
      <>
        <SongPractice
          songId={selectedSongId}
          onExit={() => {
            setViewMode('library');
            setSelectedSongId(null);
          }}
          onComplete={() => setShowSongComplete(true)}
        />
        {showSongComplete && (
          <SongComplete
            songTitle={getSongById(selectedSongId)?.title || ''}
            accuracy={computeAccuracy(sessionStats)}
            totalAttempts={sessionStats.totalAttempts}
            correctNotes={sessionStats.cleanHits}
            timeElapsed={songStartTime}
            onRetry={() => setShowSongComplete(false)}
            onBackToLibrary={() => {
              setShowSongComplete(false);
              setViewMode('library');
              setSelectedSongId(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <RandomPracticeView
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
    />
  );
};

const MainAppContent: React.FC<MainAppContentProps> = (props) => {
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

const MainApp = () => {
  const lang = useUiStore((state) => state.lang);
  const toggleLang = useUiStore((state) => state.toggleLang);
  const t = translations[lang];
  const [showPasskeyManagement, setShowPasskeyManagement] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('random');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showSongComplete, setShowSongComplete] = useState(false);
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
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedSongId={selectedSongId}
          setSelectedSongId={setSelectedSongId}
          showSongComplete={showSongComplete}
          setShowSongComplete={setShowSongComplete}
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
