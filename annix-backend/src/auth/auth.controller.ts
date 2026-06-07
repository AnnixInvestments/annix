import { Body, Controller, Get, Param, Post, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "./dto/login-user.dto";

interface RefreshTokenBody {
  refreshToken: string;
}

interface AcceptInviteBody {
  token: string;
  password: string;
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

  @Get("invite/:token")
  @ApiOperation({ summary: "Validate an invite token and return the invitee's details" })
  @ApiResponse({ status: 200, description: "Invite is valid" })
  @ApiResponse({ status: 400, description: "Invite invalid or expired" })
  async invitePreview(@Param("token") token: string) {
    return this.authService.invitePreview(token);
  }

  @Post("accept-invite")
  @ApiOperation({ summary: "Set a password from an invite token and activate the account" })
  @ApiResponse({ status: 201, description: "Account activated" })
  @ApiResponse({ status: 400, description: "Invite invalid/expired or password too weak" })
  async acceptInvite(@Body() body: AcceptInviteBody) {
    return this.authService.acceptInvite(body.token, body.password);
  }
}
