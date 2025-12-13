/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/wasm-compiler-edge';
import { ZodValidationException } from 'nestjs-zod';

interface ZodErrorType {
  issues: Array<{ path: (string | number)[]; message: string }>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: Array<{ field: string; message: string }> | null = null;

    if (exception instanceof ZodValidationException) {
      httpStatus = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';

      const ex = exception as unknown as {
        getZodError?: () => ZodErrorType;
        zodError?: ZodErrorType;
      };

      const zodError = ex.getZodError?.() || ex.zodError;

      if (zodError?.issues) {
        errorDetails = zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        httpStatus = HttpStatus.CONFLICT;
        const field = (exception.meta as any)?.target || 'field';
        message = `Unique constraint violation: The value for ${field} is already in use.`;
      } else if (exception.code === 'P2025') {
        httpStatus = HttpStatus.NOT_FOUND;
        message = 'Record not found.';
      } else {
        message = `Database error: ${(exception as Error).message}`;
      }
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        message = (response as any).message || exception.message;
        errorDetails = (response as any).error || null;
      }
    } else {
      const error = exception as Error;
      this.logger.error(error.message, error.stack);
      message = error.message || 'Internal server error';
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: message,
      details: errorDetails,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
