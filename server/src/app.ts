import { existsSync } from 'node:fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { clientDistDir, clientIndexFile, uploadsDir } from './config/paths';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import { uploadLimiter } from './middlewares/rate-limit.middleware';
import {
  ipBlockMiddleware,
  maintenanceMiddleware,
  sessionTrackingMiddleware,
} from './middlewares/system.middleware';
import { apiRouter } from './routes';
import { buildProfilePageHtml } from './services/seo.service';
import { asyncHandler } from './utils/async-handler';

export const app = express();

const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllOrigins = corsOrigins.includes('*');
const isAllowedOrigin = (origin: string): boolean => {
  if (corsOrigins.includes(origin)) return true;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'vercel.app' || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(metricsMiddleware);
app.use(ipBlockMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Keep Helmet's restrictive defaults while allowing the external
        // resources used by the app's Google sign-in and Tajawal font.
        scriptSrc: [
          "'self'",
          "'sha256-TcY8gvnDjywvz29MMHqQwJGYG6PyTSKjFzRUZT9aNWY='",
          "'sha256-a0jyf5He2QRzDQtwu6T69pbSLNfx2xxe+SKdfV2CeWY='",
          'https://accounts.google.com',
        ],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        connectSrc: ["'self'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://accounts.google.com', 'https://*.googleusercontent.com'],
        frameSrc: ["'self'", 'https:', 'http:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: !allowAllOrigins,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(sessionTrackingMiddleware);
app.use(maintenanceMiddleware);

app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '30d',
    immutable: true,
  }),
);

app.use('/api', (req, res, next) => {
  if (req.is('multipart/form-data') || req.path.endsWith('/vault/download-all')) {
    uploadLimiter(req, res, next);
    return;
  }
  next();
});
app.use('/api', apiRouter);

if (existsSync(clientIndexFile)) {
  app.get(
    '/freelancers/:id',
    asyncHandler(async (req, res, next) => {
      const host = req.get('host') ?? 'localhost';
      const html = await buildProfilePageHtml(
        String(req.params.id),
        `${req.protocol}://${host}`,
      );

      if (!html) {
        next();
        return;
      }

      res.status(200).type('html').send(html);
    }),
  );

  app.use(
    express.static(clientDistDir, {
      index: false,
    }),
  );

  app.get('*', (req, res, next) => {
    const isApiPath = req.path === '/api' || req.path.startsWith('/api/');
    const isUploadPath = req.path === '/uploads' || req.path.startsWith('/uploads/');
    if (isApiPath || isUploadPath) {
      next();
      return;
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(clientIndexFile);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
