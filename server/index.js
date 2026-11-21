import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { sessionSecret } from './lib/security.js';

const port = Number(process.env.PORT || 5000);

try {
  sessionSecret();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure MongoDB.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');
  app.listen(port, () => console.log(`Masterji API listening at http://localhost:${port}`));
} catch (error) {
  console.error(`Masterji server could not start: ${error.message}`);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => {});
}
