import { pickProfileChanges } from './profile';

describe('pickProfileChanges', () => {
  it('keeps only editable fields that were sent', () => {
    expect(pickProfileChanges({ name: 'Ana', phone: undefined, hasLocationEnabled: false })).toEqual({
      name: 'Ana',
      hasLocationEnabled: false,
    });
  });

  it('never lets privileged fields through', () => {
    const dto = { name: 'Ana', isPremium: true, userRole: 'admin', email: 'x@example.com', id: 'other' };
    expect(pickProfileChanges(dto)).toEqual({ name: 'Ana' });
  });
});
