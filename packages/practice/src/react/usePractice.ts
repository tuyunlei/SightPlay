import { useContext } from 'react';

import { PracticeContext, type PracticeClient } from './PracticeContext';

export function usePractice(): PracticeClient {
  const practice = useContext(PracticeContext);
  if (!practice) throw new Error('usePractice must be used within PracticeProvider');
  return practice;
}
