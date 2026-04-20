import http from 'http';
import { buildApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { setupSocket } from './sockets/index.js';
import { scheduleAuctionLifecycle } from './jobs/auctionLifecycleJob.js';

const bootstrap = async () => {
  await connectDB();

  const io = setupSocket();
  const app = buildApp(io);

  const server = http.createServer(app);
  io.attach(server);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use. Stop the other server or change PORT.`);
      process.exit(1);
    }

    console.error('Server failed to start:', err);
    process.exit(1);
  });

  scheduleAuctionLifecycle(io);

  server.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
};

bootstrap().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
