const db = require('./db');
const { app, request, authAs, makeSite, makeGenerator } = require('./helpers');
const ThresholdConfig = require('../models/ThresholdConfig');
const { resolveThresholds } = require('../services/thresholdService');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('threshold resolution', () => {
  it('layers generator over site over global over defaults', async () => {
    const site = await makeSite();
    const gen = await makeGenerator({ siteId: site._id, siteCode: site.siteCode });

    let t = await resolveThresholds(gen);
    expect(t.lowFuelPct).toBe(ThresholdConfig.DEFAULTS.lowFuelPct);

    await ThresholdConfig.create({ scope: 'global', lowFuelPct: 25, criticalFuelPct: 12 });
    t = await resolveThresholds(gen);
    expect(t.lowFuelPct).toBe(25);
    expect(t.criticalFuelPct).toBe(12);

    await ThresholdConfig.create({ scope: 'site', siteId: site._id, lowFuelPct: 30 });
    t = await resolveThresholds(gen);
    expect(t.lowFuelPct).toBe(30);
    expect(t.criticalFuelPct).toBe(12); // still from global

    await ThresholdConfig.create({ scope: 'generator', generatorId: gen._id, lowFuelPct: 35 });
    t = await resolveThresholds(gen);
    expect(t.lowFuelPct).toBe(35);
  });
});

describe('threshold API', () => {
  it('upserts a config for Engineer and rejects Technician', async () => {
    const eng = await authAs({ email: 'eng@test.com', role: 'Engineer' });
    const created = await request(app)
      .put('/api/thresholds')
      .set('Cookie', eng.cookies)
      .send({ scope: 'global', lowFuelPct: 22 });
    expect(created.status).toBe(201);
    expect(created.body.lowFuelPct).toBe(22);

    const updated = await request(app)
      .put('/api/thresholds')
      .set('Cookie', eng.cookies)
      .send({ scope: 'global', lowFuelPct: 18 });
    expect(updated.status).toBe(200);
    expect(updated.body.lowFuelPct).toBe(18);

    const tech = await authAs({ email: 'tech@test.com', role: 'Technician' });
    const denied = await request(app)
      .put('/api/thresholds')
      .set('Cookie', tech.cookies)
      .send({ scope: 'global', lowFuelPct: 10 });
    expect(denied.status).toBe(403);
  });

  it('returns effective thresholds for a generator', async () => {
    const gen = await makeGenerator();
    const { cookies } = await authAs({ email: 'a@test.com', role: 'Admin' });
    const res = await request(app).get(`/api/thresholds/effective/${gen._id}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('criticalTempC');
  });
});
