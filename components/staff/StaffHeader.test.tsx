import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TIME_SIGNATURES } from '../../config/music';
import { ClefType } from '../../types';

import { StaffHeader } from './StaffHeader';
import { createStaffLayout } from './staffLayout';

describe('StaffHeader time signature rendering', () => {
  const layout = createStaffLayout(1000);

  it('renders time signature from props', () => {
    render(
      <svg>
        <StaffHeader
          clef={ClefType.TREBLE}
          layout={layout}
          timeSignature={TIME_SIGNATURES['3/4']}
        />
      </svg>
    );

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('renders 6/8 time signature', () => {
    render(
      <svg>
        <StaffHeader clef={ClefType.BASS} layout={layout} timeSignature={TIME_SIGNATURES['6/8']} />
      </svg>
    );

    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
  });
});
