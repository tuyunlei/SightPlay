import { Music } from 'lucide-react';
import React from 'react';

import { GeneratedChallenge, Note } from '../../types';

export type ChallengeProgressProps = {
  challengeSequence: Note[];
  challengeIndex: number;
  challengeInfo: GeneratedChallenge | null;
};

export const ChallengeProgress: React.FC<ChallengeProgressProps> = ({
  challengeSequence,
  challengeIndex,
  challengeInfo,
}) => {
  if (challengeSequence.length === 0) return null;

  return (
    <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Music size={16} className="text-indigo-500" />
          {challengeInfo?.title}
        </span>
        <span className="text-xs font-mono text-slate-500">
          {challengeIndex} / {challengeSequence.length}
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${(challengeIndex / challengeSequence.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};
