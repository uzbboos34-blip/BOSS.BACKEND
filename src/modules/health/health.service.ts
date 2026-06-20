import { Injectable, OnModuleInit, Logger } from "@nestjs/common";

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);

  onModuleInit() {
    // Start self-pinging after a short delay (10 seconds) to let the server start fully
    setTimeout(() => this.startSelfPinging(), 10000);
  }

  private startSelfPinging() {
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL || process.env.PING_URL;
    if (!externalUrl) {
      this.logger.warn("RENDER_EXTERNAL_URL / RENDER_URL / PING_URL is not set. Skipping self-pinging keep-alive service.");
      return;
    }

    const healthUrl = `${externalUrl.replace(/\/$/, '')}/api/v1/health`;
    this.logger.log(`Starting self-ping keep-alive service targeting: ${healthUrl}`);

    // Ping every 10 minutes (600,000 ms)
    setInterval(async () => {
      try {
        this.logger.log(`Sending keep-alive self-ping to: ${healthUrl}`);
        const res = await fetch(healthUrl);
        this.logger.log(`Self-ping response status: ${res.status} (${res.statusText})`);
      } catch (err: any) {
        this.logger.error(`Self-ping failed: ${err.message || err}`);
      }
    }, 10 * 60 * 1000);
  }
}
