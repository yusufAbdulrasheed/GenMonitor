const db = require('./db');
const { app, request, authAs } = require('./helpers');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('newly protected routes', () => {
  it('requires auth for GET /api/sites', async () => {
    const res = await request(app).get('/api/sites');
    expect(res.status).toBe(401);
  });

  it('allows an authenticated non-admin to list sites but not create one', async () => {
    const { cookies } = await authAs({ email: 'eng@test.com', role: 'Engineer' });

    const list = await request(app).get('/api/sites').set('Cookie', cookies);
    expect(list.status).toBe(200);

    const create = await request(app)
      .post('/api/sites')
      .set('Cookie', cookies)
      .send({ name: 'Gamma', siteCode: 'GAMMA-01', location: 'Denver, CO' });
    expect(create.status).toBe(403);
  });

  it('lets an Admin create a site with a siteCode', async () => {
    const { cookies } = await authAs({ email: 'admin@test.com', role: 'Admin' });
    const res = await request(app)
      .post('/api/sites')
      .set('Cookie', cookies)
      .send({ name: 'Gamma', siteCode: 'gamma-01', location: 'Denver, CO' });
    expect(res.status).toBe(201);
    expect(res.body.siteCode).toBe('GAMMA-01');
  });

  it('requires auth for POST /api/seed and forbids non-admins', async () => {
    const anon = await request(app).post('/api/seed');
    expect(anon.status).toBe(401);

    const { cookies } = await authAs({ email: 'tech@test.com', role: 'Technician' });
    const forbidden = await request(app).post('/api/seed').set('Cookie', cookies);
    expect(forbidden.status).toBe(403);
  });

  it('blocks reports for roles without analytics access', async () => {
    const { cookies } = await authAs({ email: 'tech2@test.com', role: 'Technician' });
    const res = await request(app).get('/api/reports/maintenance-csv').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });

  it('allows an Admin to download the maintenance CSV', async () => {
    const { cookies } = await authAs({ email: 'admin2@test.com', role: 'Admin' });
    const res = await request(app).get('/api/reports/maintenance-csv').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
  });
});
