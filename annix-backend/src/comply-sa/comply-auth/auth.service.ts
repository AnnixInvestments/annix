import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaUser } from "../companies/entities/user.entity";
import { ComplySaLoginDto } from "./dto/login.dto";
import { ComplySaSignupDto } from "./dto/signup.dto";

@Injectable()
export class ComplySaAuthService {
  constructor(
    @InjectRepository(ComplySaUser)
    private readonly usersRepository: Repository<ComplySaUser>,
    @InjectRepository(ComplySaCompany)
    private readonly companiesRepository: Repository<ComplySaCompany>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(
    dto: ComplySaSignupDto,
  ): Promise<{ access_token: string; user: Partial<ComplySaUser> }> {
    const company = this.companiesRepository.create({
      name: dto.companyName,
      registrationNumber: dto.registrationNumber ?? null,
    });
    const savedCompany = await this.companiesRepository.save(company);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      companyId: savedCompany.id,
      role: "owner",
    });
    const savedUser = await this.usersRepository.save(user);

    const token = this.jwtService.sign({
      sub: savedUser.id,
      email: savedUser.email,
      companyId: savedCompany.id,
    });

    return {
      access_token: token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  async login(
    dto: ComplySaLoginDto,
  ): Promise<{ access_token: string; user: Partial<ComplySaUser> }> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
      relations: ["company"],
    });

    if (user === null) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
    });

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async validateUser(userId: number): Promise<ComplySaUser | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["company"],
    });

    return user ?? null;
  }
}
