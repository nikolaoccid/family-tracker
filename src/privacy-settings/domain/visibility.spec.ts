import { resolveVisibleTo, VisibilityInput } from './visibility';

const monday = (h: number) => new Date(2026, 2, 2, h);

const base = (
  overrides: Partial<VisibilityInput['settings']> = {},
  input: Partial<VisibilityInput> = {},
): VisibilityInput => ({
  userId: 'me',
  peerIds: ['mum', 'dad'],
  now: monday(12),
  settings: { locationSharingEnabled: true, visibleTo: 'all', selectedMembers: [], schedules: [], ...overrides },
  ...input,
});

describe('resolveVisibleTo', () => {
  it('shares with the whole family, and the user, when visibleTo is all', () => {
    expect(resolveVisibleTo(base())).toEqual(['mum', 'dad', 'me']);
  });

  it('shares only with the selected members', () => {
    expect(resolveVisibleTo(base({ visibleTo: 'selected', selectedMembers: ['mum'] }))).toEqual(['mum', 'me']);
  });

  it('shares with nobody but the user when visibleTo is none', () => {
    expect(resolveVisibleTo(base({ visibleTo: 'none' }))).toEqual(['me']);
  });

  it('shares with nobody, not even the user, when sharing is switched off', () => {
    expect(resolveVisibleTo(base({ locationSharingEnabled: false }))).toEqual([]);
  });

  it('an active schedule opens the location to the family even when sharing is off', () => {
    const schedules = [{ enabled: true, days: ['monday' as const], startTime: '08:00', endTime: '16:00' }];
    expect(resolveVisibleTo(base({ locationSharingEnabled: false, visibleTo: 'none', schedules }))).toEqual([
      'mum',
      'dad',
      'me',
    ]);
  });

  it('ignores a schedule outside its hours', () => {
    const schedules = [{ enabled: true, days: ['monday' as const], startTime: '08:00', endTime: '09:00' }];
    expect(resolveVisibleTo(base({ visibleTo: 'none', schedules }))).toEqual(['me']);
  });

  it('is empty without a family or without settings', () => {
    expect(resolveVisibleTo(base({}, { peerIds: [] }))).toEqual([]);
    expect(resolveVisibleTo({ ...base(), settings: null })).toEqual([]);
  });

  it('does not mutate the selected members list', () => {
    const selected = ['mum'];
    resolveVisibleTo(base({ visibleTo: 'selected', selectedMembers: selected }));
    expect(selected).toEqual(['mum']);
  });
});
