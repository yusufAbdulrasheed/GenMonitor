const db = require('./db');
const { app, request, authAs, makeGenerator } = require('./helpers');
const Alert = require('../models/Alert');
const { recordReading } = require('../services/telemetryService');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('alert engine', () => {
  it('opens a warning alert when fuel crosses the low threshold, then auto-resolves on recovery', async () => {
    const gen = await makeGenerator({ fuelLevel: 80 });

    await recordReading(gen, { fuelLevel: 12, isRunning: true }, 'manual');
    let alerts = await Alert.find({ generatorId: gen._id });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'LowFuel', severity: 'warning', status: 'open' });

    // Escalation to critical updates the same record.
    await recordReading(gen, { fuelLevel: 6 }, 'manual');
    alerts = await Alert.find({ generatorId: gen._id, status: 'open' });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');

    // Recovery past the hysteresis margin auto-resolves.
    await recordReading(gen, { fuelLevel: 40, isRunning: true }, 'manual');
    const resolved = await Alert.findOne({ generatorId: gen._id });
    expect(resolved.status).toBe('resolved');
    expect(resolved.autoResolved).toBe(true);
  });

  it('does not flap while the value hovers just above the threshold', async () => {
    const gen = await makeGenerator({ fuelLevel: 80 });
    await recordReading(gen, { fuelLevel: 12 }, 'manual'); // open (warn)
    await recordReading(gen, { fuelLevel: 21 }, 'manual'); // within margin -> stays open
    const alert = await Alert.findOne({ generatorId: gen._id });
    expect(alert.status).toBe('open');
  });
});

describe('alert API', () => {
  const openAlert = async () => {
    const gen = await makeGenerator({ fuelLevel: 80 });
    await recordReading(gen, { fuelLevel: 5 }, 'manual');
    return Alert.findOne({ generatorId: gen._id });
  };

  it('lists active alerts for any authenticated user', async () => {
    await openAlert();
    const { cookies } = await authAs({ email: 'viewer@test.com', role: 'Technician' });
    const res = await request(app).get('/api/alerts').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('lets a responder acknowledge but blocks resolve for non-managers', async () => {
    const alert = await openAlert();
    const { cookies } = await authAs({ email: 'tech@test.com', role: 'Technician' });

    const ack = await request(app).patch(`/api/alerts/${alert._id}/acknowledge`).set('Cookie', cookies);
    expect(ack.status).toBe(200);
    expect(ack.body.status).toBe('acknowledged');

    const resolve = await request(app).patch(`/api/alerts/${alert._id}/resolve`).set('Cookie', cookies);
    expect(resolve.status).toBe(403);
  });

  it('lets a manager resolve an alert', async () => {
    const alert = await openAlert();
    const { cookies } = await authAs({ email: 'mgr@test.com', role: 'NOC Manager' });
    const res = await request(app)
      .patch(`/api/alerts/${alert._id}/resolve`)
      .set('Cookie', cookies)
      .send({ note: 'Refuelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
    expect(res.body.notes).toHaveLength(1);
  });

  it('reports stats', async () => {
    await openAlert();
    const { cookies } = await authAs({ email: 'a@test.com', role: 'Admin' });
    const res = await request(app).get('/api/alerts/stats').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('critical');
  });
});
