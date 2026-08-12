import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translations } from '../../i18n';
import { useUiStore } from '../../store/uiStore';

import { SongLibrary } from './SongLibrary';

describe('SongLibrary route projection', () => {
  beforeEach(() => {
    useUiStore.setState({ lang: 'en' });
  });

  it('projects the controlled difficulty and emits a semantic filter intent', () => {
    const onDifficultyChange = vi.fn();
    const { rerender } = render(
      <SongLibrary
        difficulty="intermediate"
        onDifficultyChange={onDifficultyChange}
        onSongSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Minuet in G')).toBeTruthy();
    expect(screen.queryByText('Twinkle Twinkle Little Star')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: translations.en.difficulty_advanced }));
    expect(onDifficultyChange).toHaveBeenCalledWith('advanced');
    expect(screen.queryByText('Canon in D')).toBeNull();

    rerender(
      <SongLibrary
        difficulty="advanced"
        onDifficultyChange={onDifficultyChange}
        onSongSelect={vi.fn()}
      />
    );
    expect(screen.getByText('Canon in D')).toBeTruthy();
    expect(screen.queryByText('Minuet in G')).toBeNull();
  });
});
