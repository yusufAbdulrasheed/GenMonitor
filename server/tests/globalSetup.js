// Starts one in-memory MongoDB for the whole test run. The first run downloads
// a MongoDB binary (needs network); it is cached for subsequent runs.
//
// Pin the version via MONGOMS_VERSION so CI and local dev agree and so a
// machine that already has a compatible binary cached does not re-download.
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const version = process.env.MONGOMS_VERSION || '8.2.6';
  const mongod = await MongoMemoryServer.create({ binary: { version } });
  globalThis.__MONGOD__ = mongod;
  process.env.MONGO_URI = mongod.getUri();
};
