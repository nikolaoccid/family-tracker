import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../common/config/app-config';
import { MailTokenService } from './mail-token.service';

const secret = 'mail-secret-0123456';
const service = new MailTokenService({ jwtMailSecret: secret } as AppConfig);

describe('family invite tokens', () => {
  it('round-trips the invited address and family', () => {
    const token = service.signFamilyInvite('fam-1', 'ana@example.com');
    const claims = service.verifyFamilyInvite(token);
    expect(claims).toMatchObject({ userId: 'ana@example.com', familyId: 'fam-1' });
    expect(new Date(claims.expiresAt as string).getTime()).toBeGreaterThan(Date.now());
  });

  it('expires', () => {
    const token = jwt.sign({ userId: 'a@example.com', familyId: 'f' }, secret, { expiresIn: -10 });
    expect(() => service.verifyFamilyInvite(token)).toThrow(/Invalid or expired/);
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ userId: 'a@example.com', familyId: 'f' }, 'another-secret-value');
    expect(() => service.verifyFamilyInvite(forged)).toThrow(/Invalid or expired/);
  });

  it('rejects tampered payloads', () => {
    const [head, , sig] = service.signFamilyInvite('fam-1', 'ana@example.com').split('.');
    const body = Buffer.from(JSON.stringify({ userId: 'eve@example.com', familyId: 'fam-1' })).toString('base64url');
    expect(() => service.verifyFamilyInvite(`${head}.${body}.${sig}`)).toThrow();
  });

  it('rejects an account token used as an invite', () => {
    expect(() => service.verifyFamilyInvite(service.sign('user-1'))).toThrow(/payload/);
  });

  it('rejects an empty token', () => {
    expect(() => service.verifyFamilyInvite('')).toThrow(/Missing token/);
  });
});

describe('account tokens', () => {
  it('round-trips the user id', () => {
    expect(service.verify(service.sign('user-1'))).toEqual({ userId: 'user-1' });
  });
});
