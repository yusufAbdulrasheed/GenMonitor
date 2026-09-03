const db = require('./db');
const { app, request, authAs, makeGenerator } = require('./helpers');
const Generator = require('../models/Generator');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const create = (cookies, body) =>
  request(app).post('/api/work-orders').set('Cookie', cookies).send(body);

describe('work order lifecycle', () => {
  it('creates a work order, generates a code, and sets the generator UnderMaintenance', async () => {
    const gen = await makeGenerator({ status: 'Running' });
    const { cookies } = await authAs({ email: 'eng@test.com', role: 'Engineer' });

    const res = await create(cookies, { generatorId: gen._id, title: 'Oil change', type: 'preventive' });
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^WO-/);
    expect(res.body.status).toBe('open');

    const refreshed = await Generator.findById(gen._id);
    expect(refreshed.status).toBe('UnderMaintenance');
  });

  it('records a timeline entry on status change and restores generator status when completed', async () => {
    const gen = await makeGenerator({ status: 'Running' });
    const { cookies } = await authAs({ email: 'eng2@test.com', role: 'Engineer' });
    const wo = (await create(cookies, { generatorId: gen._id, title: 'Inspection' })).body;

    const inProgress = await request(app)
      .patch(`/api/work-orders/${wo.id || wo._id}/status`)
      .set('Cookie', cookies)
      .send({ status: 'in_progress', note: 'starting' });
    expect(inProgress.status).toBe(200);
    expect(inProgress.body.startedAt).toBeTruthy();
    expect(inProgress.body.timeline.some((t) => t.toStatus === 'in_progress')).toBe(true);

    const done = await request(app)
      .patch(`/api/work-orders/${wo.id || wo._id}/status`)
      .set('Cookie', cookies)
      .send({ status: 'completed' });
    expect(done.body.completedAt).toBeTruthy();

    const refreshed = await Generator.findById(gen._id);
    expect(refreshed.status).toBe('Standby');
    expect(refreshed.lastMaintenance).toBeTruthy();
  });

  it('recomputes cost when parts and labor are added', async () => {
    const gen = await makeGenerator();
    const { cookies } = await authAs({ email: 'tech@test.com', role: 'Technician' });
    const wo = (await create(cookies, { generatorId: gen._id, title: 'Repair' })).body;
    const id = wo.id || wo._id;

    await request(app)
      .post(`/api/work-orders/${id}/parts`)
      .set('Cookie', cookies)
      .send({ name: 'Filter', quantity: 2, unitCost: 15 });

    const updated = await request(app)
      .put(`/api/work-orders/${id}`)
      .set('Cookie', cookies)
      .send({ laborHours: 3, laborRate: 40 });

    expect(updated.body.costTotal).toBe(2 * 15 + 3 * 40); // 150
  });

  it('signs off a work order', async () => {
    const gen = await makeGenerator();
    const { cookies } = await authAs({ email: 'tech2@test.com', role: 'Technician' });
    const wo = (await create(cookies, { generatorId: gen._id, title: 'Service' })).body;
    const id = wo.id || wo._id;

    const res = await request(app)
      .post(`/api/work-orders/${id}/sign-off`)
      .set('Cookie', cookies)
      .send({ notes: 'All good' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.signOff.notes).toBe('All good');
  });

  it('blocks NOC Manager from creating work orders', async () => {
    const gen = await makeGenerator();
    const { cookies } = await authAs({ email: 'noc@test.com', role: 'NOC Manager' });
    const res = await create(cookies, { generatorId: gen._id, title: 'x' });
    expect(res.status).toBe(403);
  });
});
