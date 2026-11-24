import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';

/** Flips to "not ready" as soon as shutdown starts so the load balancer drains us before the process exits. */
@Injectable()
export class Readiness implements BeforeApplicationShutdown {
  private shuttingDown = false;

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  beforeApplicationShutdown(): void {
    this.shuttingDown = true;
  }
}
