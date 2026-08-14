import { useContext } from 'react';

import { GuidanceContext } from './GuidanceContext';

export function useGuidance() {
  const guidance = useContext(GuidanceContext);
  if (!guidance) throw new Error('useGuidance must be used within GuidanceProvider');
  return guidance;
}
