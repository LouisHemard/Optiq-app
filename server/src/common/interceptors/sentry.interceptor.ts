import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Intercepteur global qui remonte les erreurs serveur (5xx ou exceptions
 * non maîtrisées) vers Sentry. Les erreurs métier classiques (4xx) sont
 * volontairement ignorées pour ne pas polluer la supervision.
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        if (this.shouldReport(error)) {
          Sentry.captureException(error, {
            extra: this.buildExtraContext(context),
          });
        }
        return throwError(() => error);
      }),
    );
  }

  private shouldReport(error: unknown): boolean {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      return status >= 500;
    }
    return true;
  }

  private buildExtraContext(
    context: ExecutionContext,
  ): Record<string, unknown> {
    const type = context.getType<'http' | 'rpc' | 'ws'>();
    if (type !== 'http') {
      return { contextType: type };
    }

    const http = context.switchToHttp();
    const req = http.getRequest<{
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      ip?: string;
      user?: { id?: string };
    }>();

    return {
      method: req?.method,
      url: req?.url,
      ip: req?.ip,
      userId: req?.user?.id,
      userAgent: req?.headers?.['user-agent'],
    };
  }
}
