import React from 'react';

import { ClefType } from '../../types';

import { StaffLayout } from './staffLayout';

export type StaffHeaderProps = {
  clef: ClefType;
  layout: StaffLayout;
};

export const StaffHeader: React.FC<StaffHeaderProps> = ({ clef, layout }) => (
  <>
    {clef === ClefType.TREBLE ? (
      <text
        x={layout.CLEF_X}
        y={layout.TREBLE_CLEF_Y}
        fontSize={layout.TREBLE_CLEF_SIZE}
        fontFamily="serif"
        fill="#0f172a"
      >
        𝄞
      </text>
    ) : (
      <text
        x={layout.CLEF_X}
        y={layout.BASS_CLEF_Y}
        fontSize={layout.BASS_CLEF_SIZE}
        fontFamily="serif"
        fill="#0f172a"
      >
        𝄢
      </text>
    )}
    <text
      x={layout.TIME_SIG_X}
      y={layout.STAFF_CENTER_Y - layout.STAFF_SPACE * 0.25}
      fontSize={layout.TIME_SIG_SIZE}
      fontFamily="serif"
      fontWeight="bold"
      fill="#0f172a"
    >
      4
    </text>
    <text
      x={layout.TIME_SIG_X}
      y={layout.STAFF_CENTER_Y + layout.STAFF_SPACE * 1.75}
      fontSize={layout.TIME_SIG_SIZE}
      fontFamily="serif"
      fontWeight="bold"
      fill="#0f172a"
    >
      4
    </text>
  </>
);
