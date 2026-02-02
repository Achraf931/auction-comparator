import { initializeDatabase } from '../db';

export default defineNitroPlugin(() => {
  // Initialize database on server start
  initializeDatabase();
});
