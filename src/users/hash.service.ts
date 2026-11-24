import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';

@Injectable()
export class HashService {
  private saltOrRounds = 10;

  async hashPassword(password: string) {
    return await hash(password, this.saltOrRounds);
  }
  async isMatch(password: string, passwordHash: string | null) {
    // Accounts without a password hash (Google sign-in) can never match.
    return passwordHash ? compare(password, passwordHash) : false;
  }
}
