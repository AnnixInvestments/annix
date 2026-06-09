import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { nowMillis } from "../lib/datetime";
import { RequestMetricsService } from "./request-metrics.service";

interface TimedRequest {
  method?: string;
  url?: string;
  route?: { path?: string };
}

interface TimedResponse {
  statusCode?: number;
}

function stripQuery(url: string): string {
  const index = url.indexOf("?");
  return index >= 0 ? url.slice(0, index) : url;
}

function routeLabel(request: TimedRequest): string {
  const method = request.method ?? "GET";
  const routePath = request.route?.path;
  const path = routePath ?? stripQuery(request.url ?? "unknown");
  return `${method} ${path}`;
}

@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: RequestMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }
    const http = context.switchToHttp();
    const request = http.getRequest<TimedRequest>();
    const response = http.getResponse<TimedResponse>();
    const route = routeLabel(request);
    const startedAt = nowMillis();
    this.metrics.beginRequest();
    return next.handle().pipe(
      finalize(() => {
        const status = typeof response.statusCode === "number" ? response.statusCode : 0;
        this.metrics.endRequest(nowMillis() - startedAt, status, route);
      }),
    );
  }
}
