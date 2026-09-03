// Runs before any module is required (Jest `setupFiles`). Provides the env vars
// that config/env.js validates, so requiring the app in tests never process.exit().
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test-placeholder';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ENABLE_SIMULATION = 'false';
process.env.ALLOW_SEED = 'true';
process.env.BCRYPT_SALT_ROUNDS = '4'; // faster hashing in tests
