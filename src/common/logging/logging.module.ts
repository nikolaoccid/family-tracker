import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { AppConfig } from '../config/app-config';

export const REQUEST_ID_HEADER = 'x-request-id';

/** JSON logs to stdout, one line per request, request id from X-Request-Id (generated if absent). */
export const loggingModule = LoggerModule.forRootAsync({
  inject: [AppConfig],
  useFactory: (config: AppConfig) => ({
    pinoHttp: {
      level: config.logLevel,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    },
  }),
});
