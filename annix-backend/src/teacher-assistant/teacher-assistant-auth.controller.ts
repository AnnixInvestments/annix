import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { LoginTeacherDto, RefreshTeacherDto, RegisterTeacherDto } from "./dto/auth.dto";
import {
  TeacherAssistantAuthGuard,
  type TeacherAssistantRequest,
} from "./guards/teacher-assistant-auth.guard";
import {
  type TeacherAssistantAuthResult,
  TeacherAssistantAuthService,
  type TeacherAssistantAuthUser,
  type TeacherAssistantRefreshResult,
} from "./services/teacher-assistant-auth.service";

@Controller("teacher-assistant/auth")
export class TeacherAssistantAuthController {
  constructor(private readonly authService: TeacherAssistantAuthService) {}

  @Post("register")
  async register(@Body() body: RegisterTeacherDto): Promise<TeacherAssistantAuthResult> {
    return this.authService.register({
      email: body.email,
      password: body.password,
      name: body.name,
      schoolName: body.schoolName ?? null,
    });
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: LoginTeacherDto): Promise<TeacherAssistantAuthResult> {
    return this.authService.login(body.email, body.password);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Body() body: RefreshTeacherDto): Promise<TeacherAssistantRefreshResult> {
    return this.authService.refresh(body.refreshToken);
  }

  @Get("me")
  @UseGuards(TeacherAssistantAuthGuard)
  async me(@Req() request: TeacherAssistantRequest): Promise<TeacherAssistantAuthUser> {
    const user = await this.authService.findById(request.user.id);
    if (!user) {
      return {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        schoolName: request.user.schoolName,
      };
    }
    return this.authService.toAuthUser(user);
  }
}
