import { Body, Controller, Post, HttpCode, HttpStatus, Get, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login-dto";
import { RefreshDto } from "./dto/refresh-dto";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";

@ApiTags("auth")
@Controller("auth")
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("app-version")
  @ApiOperation({ summary: "Get latest app version from Vercel" })
  async getAppVersion() {
    try {
      const response = await fetch("https://boss-frontent.vercel.app/version.json?t=" + Date.now(), {
        headers: { "Cache-Control": "no-cache" }
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, ...data };
      }
      return { success: false, message: `Server returned status ${response.status}` };
    } catch (e) {
      return { success: false, message: e.message || "Failed to fetch version info" };
    }
  }

  @Post("login")
  @ApiOperation({ summary: "Tizimga kirish" })
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Tokenni yangilash (refresh)" })
  refresh(@Body() payload: RefreshDto) {
    return this.authService.refresh(payload.refreshToken);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Joriy foydalanuvchi ma'lumotlarini olish" })
  getMe(@Req() req: any) {
    const user = req.user;
    return {
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        full_name: user.fullName,
        phone: user.phone,
        role: user.role,
        email: "",
        address: "",
        status: user.isActive ? "active" : "inactive",
        photo: null,
      }
    };
  }
}

