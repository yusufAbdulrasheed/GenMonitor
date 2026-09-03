const db = require('./db');
const { app, request, authAs, createUser, makeGenerator } = require('./helpers');
const AuditEvent = require('../models/AuditEvent');
const Notification = require('../models/Notification');
const { recordReading } = require('../services/telemetryService');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('audit trail', () => {
  it('records an AuditEvent when a generator is created and exposes it via /api/activity', async () => {
    const admin = await authAs({ email: 'admin@test.com', role: 'Admin' });

    const created = await request(app)
      .post('/api/generators')
      .set('Cookie', admin.cookies)
      .send({
        siteCode: 'SITE-01',
        generatorId: 'GEN-AUDIT-1',
        make: 'Cummins',
        model: 'C150',
        capacityKVA: 150,
        fuelTankSize: 500,
        installationDate: '2021-01-01',
      });
    expect(created.status).toBe(201);

    const event = await AuditEvent.findOne({ entity: 'Generator', action: 'create' });
    expect(event).toBeTruthy();
    expect(event.actor.email).toBe('admin@test.com');

    const activity = await request(app).get('/api/activity?entity=Generator').set('Cookie', admin.cookies);
    expect(activity.status).toBe(200);
    expect(activity.body.events.length).toBeGreaterThan(0);
  });

  it('blocks /api/activity for Engineer', async () => {
    const { cookies } = await authAs({ email: 'eng@test.com', role: 'Engineer' });
    const res = await request(app).get('/api/activity').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });

  it('logs a login event', async () => {
    await authAs({ email: 'loguser@test.com', role: 'Technician' });
    const event = await AuditEvent.findOne({ action: 'login' });
    expect(event).toBeTruthy();
    expect(event.entity).toBe('Auth');
  });
});

describe('notifications', () => {
  it('fans a new critical alert out to manager roles and supports read/unread', async () => {
    await createUser({ email: 'mgr@test.com', role: 'NOC Manager' });
    const engineer = await authAs({ email: 'eng2@test.com', role: 'Engineer' });

    const gen = await makeGenerator({ fuelLevel: 80 });
    await recordReading(gen, { fuelLevel: 4 }, 'manual'); // critical -> notifies Admin/Engineer/NOC Manager

    const list = await request(app).get('/api/notifications').set('Cookie', engineer.cookies);
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);

    const unread = await request(app).get('/api/notifications/unread-count').set('Cookie', engineer.cookies);
    expect(unread.body.count).toBeGreaterThan(0);

    await request(app).patch('/api/notifications/read-all').set('Cookie', engineer.cookies);
    const after = await request(app).get('/api/notifications/unread-count').set('Cookie', engineer.cookies);
    expect(after.body.count).toBe(0);

    // Technician (not a manager role) should not have been notified.
    const techNotifs = await Notification.countDocuments();
    expect(techNotifs).toBeGreaterThan(0);
  });

  it('updates notification preferences', async () => {
    const { cookies } = await authAs({ email: 'prefs@test.com', role: 'Admin' });
    const res = await request(app)
      .put('/api/notifications/prefs')
      .set('Cookie', cookies)
      .send({ emailOnCritical: false });
    expect(res.status).toBe(200);
    expect(res.body.emailOnCritical).toBe(false);
  });
});
