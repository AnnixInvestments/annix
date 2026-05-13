import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "./dto/login-user.dto";

interface RefreshTokenBody {
  refreshToken: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Login and get JWT token" })
  @ApiResponse({ status: 201, description: "JWT access token returned" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginUserDto: LoginUserDto) {
    const user = await this.authService.validateUser(loginUserDto.email, loginUserDto.password);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.authService.login(user);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Exchange a refresh token for a fresh access + refresh token pair" })
  @ApiResponse({ status: 201, description: "Fresh token pair returned" })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(@Body() body: RefreshTokenBody) {
    const tokens = await this.authService.refreshToken(body.refreshToken);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }
}
