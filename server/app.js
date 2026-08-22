import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import pg from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const PgStore = pgSession(session);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();

// Trust proxy for secure cookies behind Render / Vercel reverse proxies
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: 'no-referrer' },
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://swiss-bank-zeta.vercel.app',
  /\.vercel\.app$/,
  /\.onrender\.com$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in production for client rewrites
    }
  },
  credentials: true,
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new PgStore({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'swiss_bank_secret_key',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Actuator health check endpoint for compatibility
app.get('/actuator/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Mount all API routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
