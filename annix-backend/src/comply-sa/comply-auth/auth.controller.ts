import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ComplySaAuthService } from "./auth.service";
import { ComplySaLoginDto } from "./dto/login.dto";
import { ComplySaSignupDto } from "./dto/signup.dto";

@ApiTags("comply-sa/auth")
@Controller("comply-sa/auth")
export class ComplySaAuthController {
  constructor(private readonly authService: ComplySaAuthService) {}

  @Post("signup")
  async signup(@Body() dto: ComplySaSignupDto) {
    return this.authService.signup(dto);
  }

  @Post("login")
  async login(@Body() dto: ComplySaLoginDto) {
    return this.authService.login(dto);
  }
}
