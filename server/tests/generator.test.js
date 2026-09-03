const db = require('./db');
const { app, request, authAs } = require('./helpers');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const genPayload = (overrides = {}) => ({
  siteCode: 'ALPHA-01',
  generatorId: 'GEN-TEST-1',
  make: 'Cummins',
  model: 'C150D5',
  capacityKVA: 150,
  fuelTankSize: 500,
  installationDate: '2021-01-01',
  ...overrides,
});

describe('generator RBAC', () => {
  it('lets an Admin create a generator', async () => {
    const { cookies } = await authAs({ email: 'admin@test.com', role: 'Admin' });
    const res = await request(app).post('/api/generators').set('Cookie', cookies).send(genPayload());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ generatorId: 'GEN-TEST-1', siteCode: 'ALPHA-01' });
    // serialNumber falls back to generatorId when omitted
    expect(res.body.serialNumber).toBe('GEN-TEST-1');
  });

  it('forbids a Technician from creating a generator', async () => {
    const { cookies } = await authAs({ email: 'tech@test.com', role: 'Technician' });
    const res = await request(app).post('/api/generators').set('Cookie', cookies).send(genPayload());
    expect(res.status).toBe(403);
  });

  it('lets any authenticated role list generators', async () => {
    const { cookies } = await authAs({ email: 'noc@test.com', role: 'NOC Manager' });
    const res = await request(app).get('/api/generators').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.generators)).toBe(true);
  });

  it('forbids a Technician from editing a generator', async () => {
    const admin = await authAs({ email: 'admin2@test.com', role: 'Admin' });
    const created = await request(app)
      .post('/api/generators')
      .set('Cookie', admin.cookies)
      .send(genPayload({ generatorId: 'GEN-TEST-2' }));

    const tech = await authAs({ email: 'tech2@test.com', role: 'Technician' });
    const res = await request(app)
      .put(`/api/generators/${created.body._id}`)
      .set('Cookie', tech.cookies)
      .send({ make: 'Caterpillar' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/generators/realtime', () => {
  it('returns a read-only snapshot without persisting simulated drift', async () => {
    const { cookies } = await authAs({ email: 'admin3@test.com', role: 'Admin' });
    await request(app)
      .post('/api/generators')
      .set('Cookie', cookies)
      .send(genPayload({ generatorId: 'GEN-RT-1', status: 'Running', fuelLevel: 50, runtimeHours: 10 }));

    const first = await request(app).get('/api/generators/realtime').set('Cookie', cookies);
    const second = await request(app).get('/api/generators/realtime').set('Cookie', cookies);

    expect(first.status).toBe(200);
    expect(Array.isArray(first.body)).toBe(true);
    // No mutation on read: runtime/fuel identical across two GETs.
    expect(second.body[0].runtimeHours).toBe(first.body[0].runtimeHours);
    expect(second.body[0].fuelLevel).toBe(first.body[0].fuelLevel);
  });
});
