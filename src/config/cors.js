import { env } from './env.js';

const localhostPorts = [
  3000,
  5173,
  5174,
  5175,
  5176,
  5178,
  5179
];

const localhostOrigins = localhostPorts.flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`
]);

export const allowedOrigins = [...new Set([
  ...localhostOrigins,
  env.clientUrl
].filter(Boolean))];

export const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204
};
