import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

export interface HashedPassword {
  hash: string;
  salt: string;
  passwordHash: string;
}

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<HashedPassword> {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt, passwordHash: hash };
  }

  async hashSimple(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
