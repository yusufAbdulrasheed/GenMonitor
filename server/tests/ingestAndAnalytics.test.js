const db = require('./db');
const { app, request, authAs, makeGenerator } = require('./helpers');
const Reading = require('../models/Reading');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('device ingestion via API key', () => {
  it('creates a key (raw shown once), ingests readings, and rejects a bad key', async () => {
    const gen = await makeGenerator();
    const admin = await authAs({ email: 'admin@test.com', role: 'Admin' });

    const keyRes = await request(app)
      .post('/api/api-keys')
      .set('Cookie', admin.cookies)
      .send({ name: 'Gateway A', scope: 'fleet' });
    expect(keyRes.status).toBe(201);
    expect(keyRes.body.key).toMatch(/^gmk_/);

    const rawKey = keyRes.body.key;

    const ingest = await request(app)
      .post('/api/ingest/readings')
      .set('x-api-key', rawKey)
      .send({ readings: [{ generatorId: String(gen._id), fuelLevel: 55, temperature: 60, batteryVoltage: 12.2 }] });
    expect(ingest.status).toBe(202);
    expect(ingest.body.accepted).toBe(1);

    const readings = await Reading.find({ generatorId: gen._id, source: 'device' });
    expect(readings).toHaveLength(1);

    const bad = await request(app)
      .post('/api/ingest/readings')
      .set('x-api-key', 'gmk_notarealkey')
      .send({ fuelLevel: 10 });
    expect(bad.status).toBe(401);

    // key list never exposes the hash or raw value
    const list = await request(app).get('/api/api-keys').set('Cookie', admin.cookies);
    expect(list.body[0]).not.toHaveProperty('keyHash');
    expect(list.body[0]).not.toHaveProperty('key');
  });

  it('requires Admin to manage keys', async () => {
    const { cookies } = await authAs({ email: 'eng@test.com', role: 'Engineer' });
    const res = await request(app).get('/api/api-keys').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});

describe('analytics', () => {
  it('returns a fleet summary and generator history', async () => {
    const gen = await makeGenerator();
    const now = Date.now();
    await Reading.insertMany(
      Array.from({ length: 10 }, (_, i) => ({
        generatorId: gen._id,
        timestamp: new Date(now - (10 - i) * 3600e3),
        fuelLevel: 90 - i * 3,
        temperature: 50,
        batteryVoltage: 12.3,
        runtimeHours: 100 + i,
        status: i === 5 ? 'Fault' : 'Running',
      }))
    );

    const { cookies } = await authAs({ email: 'noc@test.com', role: 'NOC Manager' });

    const summary = await request(app).get('/api/analytics/summary?range=7d').set('Cookie', cookies);
    expect(summary.status).toBe(200);
    expect(summary.body).toHaveProperty('availabilityPct');
    expect(summary.body.generators.total).toBe(1);

    const history = await request(app).get(`/api/generators/${gen._id}/history?range=24h`).set('Cookie', cookies);
    expect(history.status).toBe(200);
    expect(history.body.length).toBe(10);

    const perGen = await request(app).get(`/api/analytics/generators/${gen._id}?range=7d`).set('Cookie', cookies);
    expect(perGen.body.runtimeAccruedHours).toBe(9);
  });
});
