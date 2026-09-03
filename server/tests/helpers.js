const bcrypt = require('bcryptjs');
const request = require('supertest');
const User = require('../models/User');
const Site = require('../models/Site');
const Generator = require('../models/Generator');
const app = require('../app');

const createUser = async ({
  name = 'Test User',
  email = 'user@test.com',
  role = 'Admin',
  password = 'password123',
  isActive = true,
} = {}) => {
  const hashed = await bcrypt.hash(password, 4);
  const user = await User.create({ name, email, role, password: hashed, isActive });
  return { user, password };
};

const loginCookies = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.headers['set-cookie'];
};

const authAs = async (overrides = {}) => {
  const { user, password } = await createUser(overrides);
  const cookies = await loginCookies(user.email, password);
  return { user, cookies };
};

let siteSeq = 0;
const makeSite = (overrides = {}) => {
  siteSeq += 1;
  return Site.create({
    name: overrides.name || `Site ${siteSeq}`,
    siteCode: overrides.siteCode || `SITE-${String(siteSeq).padStart(2, '0')}`,
    location: overrides.location || 'Somewhere',
    coordinates: overrides.coordinates || { lat: 1, lng: 1 },
    ...overrides,
  });
};

let genSeq = 0;
const makeGenerator = (overrides = {}) => {
  genSeq += 1;
  return Generator.create({
    siteCode: overrides.siteCode || 'SITE-01',
    generatorId: overrides.generatorId || `GEN-${String(genSeq).padStart(4, '0')}`,
    serialNumber: overrides.serialNumber || `SN-${genSeq}`,
    make: 'Cummins',
    model: 'C150D5',
    capacityKVA: 150,
    fuelTankSize: 500,
    installationDate: new Date('2021-01-01'),
    status: 'Running',
    fuelLevel: 80,
    batteryVoltage: 12.4,
    temperature: 45,
    runtimeHours: 100,
    ...overrides,
  });
};

module.exports = { app, request, createUser, loginCookies, authAs, makeSite, makeGenerator };
