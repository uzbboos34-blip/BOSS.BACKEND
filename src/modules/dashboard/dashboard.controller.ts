import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";

@ApiTags("dashboard")
@Controller("dashboard")
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Sistemadagi umumiy statistikalarni olish" })
  getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user);
  }
}
