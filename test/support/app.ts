import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { UnauthorizedError } from '../../src/common/errors/domain-error';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap/configure-app';
import { AppConfig } from '../../src/common/config/app-config';
import { GoogleIdentityGateway } from '../../src/auth/google-identity.gateway';
import { MailService } from '../../src/mailer';
import { PaymentsGateway } from '../../src/payments/payments.gateway';
import { TEST_DB } from './global-setup';

export interface SentInvite {
  email: string;
  familyId: string;
}

/** Records outgoing mail instead of sending it; tests read the invite token back from the signed link. */
export class FakeMail {
  invites: SentInvite[] = [];
  resets: string[] = [];
  sendFamilyInvitationEmail(email: string, familyId: string): Promise<void> {
    this.invites.push({ email, familyId });
    return Promise.resolve();
  }
  sendResetPasswordEmail(_id: string, email: string): Promise<void> {
    this.resets.push(email);
    return Promise.resolve();
  }
  sendConfirmAccountEmail(): Promise<void> {
    return Promise.resolve();
  }
}

export const fakeSubscriptions = new Map<
  string,
  { customerId: string; customerEmail: string | null; active: boolean; currentPeriodEnd: Date }
>();

/** Maps a fake ID token ("good:<subject>:<email>") to an identity; anything else is rejected. */
export const fakeGoogle = {
  verify: jest.fn((idToken: string) => {
    const [kind, subject, email] = idToken.split(':');
    if (kind !== 'good') return Promise.reject(new UnauthorizedError('GOOGLE_TOKEN_INVALID', 'Invalid Google token'));
    return Promise.resolve({ subject, email, name: 'Gina Google' });
  }),
};

export const fakePayments = {
  retrieveSubscription: jest.fn((id: string) => Promise.resolve(fakeSubscriptions.get(id) ?? null)),
  createPaymentIntent: jest.fn(() => Promise.resolve({ clientSecret: 'secret_test', customerId: 'cus_test' })),
};

function setTestEnvironment(): void {
  const base = process.env.TEST_DATABASE_URL ?? `postgres://familytracker:familytracker@localhost:54320/${TEST_DB}`;
  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: base,
    DATABASE_DISABLE_SSL: 'true',
    SESSION_SECRET: 'e2e-session-secret-0000',
    JWT_SECRET: 'e2e-jwt-secret-0000000',
    JWT_MAIL_SECRET: 'e2e-mail-secret-000000',
    MAIL_HOST: 'localhost',
    MAIL_USER: 'e2e',
    MAIL_PASS: 'e2e',
    MAIL_FROM: 'e2e@example.com',
    STRIPE_SECRET_KEY: 'sk_test_e2e',
    STREAM_API_KEY: 'e2e-key',
    STREAM_API_SECRET: 'e2e-secret',
    CORS_ORIGINS: 'https://app.example.com',
  });
}

/** Clears the in-memory rate-limit counters so a suite can register many users. */
function clearRateLimits(app: INestApplication): void {
  const store = app.get(ThrottlerStorage);
  store.storage.clear();
  store.hitExpirations.clear();
}

export interface TestApp {
  app: INestApplication;
  mail: FakeMail;
  http: () => ReturnType<typeof request>;
  resetRateLimits: () => void;
}

export async function createTestApp(): Promise<TestApp> {
  setTestEnvironment();
  const mail = new FakeMail();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .overrideProvider(GoogleIdentityGateway)
    .useValue(fakeGoogle)
    .overrideProvider(PaymentsGateway)
    .useValue(fakePayments)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, app.get(AppConfig));
  await app.init();
  return { app, mail, http: () => request(app.getHttpServer()), resetRateLimits: () => clearRateLimits(app) };
}

let counter = 0;
export const unique = (label: string): string => `${label}-${Date.now()}-${counter++}`;

export interface Account {
  id: string;
  email: string;
  token: string;
  auth: { Authorization: string };
}

export async function register(t: TestApp, label: string): Promise<Account> {
  t.resetRateLimits();
  const email = `${unique(label)}@example.com`;
  const res = await t.http().post('/users').send({ email, password: 'Passw0rd!e2e', name: label }).expect(201);
  const token = res.body.token as string;
  return { id: res.body.user.id as string, email, token, auth: { Authorization: `Bearer ${token}` } };
}

export const around = { latitude: 45.8131, longitude: 15.9775 };
