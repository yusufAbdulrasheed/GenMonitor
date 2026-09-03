const db = require('./db');
const { app, request, authAs, makeGenerator } = require('./helpers');
const MaintenancePlan = require('../models/MaintenancePlan');
const WorkOrder = require('../models/WorkOrder');
const Alert = require('../models/Alert');
const { sweep, generateDueWorkOrders, flagOverdueWorkOrders } = require('../services/maintenanceService');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('maintenance plan generation', () => {
  it('generates a work order when a runtime-hours plan is due, once', async () => {
    const gen = await makeGenerator({ runtimeHours: 500 });
    await MaintenancePlan.create({
      generatorId: gen._id,
      name: '250h service',
      intervalType: 'runtimeHours',
      intervalValue: 250,
      anchorRuntimeHours: 100, // due at 350, generator already at 500
    });

    const first = await generateDueWorkOrders();
    expect(first.created).toBe(1);

    const wos = await WorkOrder.find({ generatorId: gen._id });
    expect(wos).toHaveLength(1);
    expect(wos[0].type).toBe('preventive');

    // Idempotent while the work order is still open.
    const second = await generateDueWorkOrders();
    expect(second.created).toBe(0);
  });

  it('generates for a days-interval plan past its due date', async () => {
    const gen = await makeGenerator();
    await MaintenancePlan.create({
      generatorId: gen._id,
      name: 'Quarterly',
      intervalType: 'days',
      intervalValue: 90,
      anchorDate: new Date(Date.now() - 120 * 24 * 3600e3),
      leadTimeDays: 3,
    });
    const { created } = await generateDueWorkOrders();
    expect(created).toBe(1);
  });

  it('raises a MaintenanceOverdue alert for an SLA-breached work order and clears it when resolved', async () => {
    const gen = await makeGenerator();
    await WorkOrder.create({
      generatorId: gen._id,
      title: 'Late job',
      status: 'open',
      slaDueAt: new Date(Date.now() - 24 * 3600e3),
    });

    await flagOverdueWorkOrders();
    let alert = await Alert.findOne({ generatorId: gen._id, type: 'MaintenanceOverdue' });
    expect(alert).toBeTruthy();
    expect(alert.status).toBe('open');

    await WorkOrder.updateMany({ generatorId: gen._id }, { status: 'completed' });
    await flagOverdueWorkOrders();
    alert = await Alert.findOne({ generatorId: gen._id, type: 'MaintenanceOverdue' });
    expect(alert.status).toBe('resolved');
  });
});

describe('maintenance plan API', () => {
  it('creates a plan as Engineer and runs the sweep', async () => {
    const gen = await makeGenerator({ runtimeHours: 500 });
    const { cookies } = await authAs({ email: 'eng@test.com', role: 'Engineer' });

    const created = await request(app)
      .post('/api/maintenance-plans')
      .set('Cookie', cookies)
      .send({ generatorId: gen._id, name: 'Svc', intervalType: 'runtimeHours', intervalValue: 100, anchorRuntimeHours: 100 });
    expect(created.status).toBe(201);
    expect(created.body.nextDue).toBeUndefined(); // create returns the raw plan

    const list = await request(app).get('/api/maintenance-plans').set('Cookie', cookies);
    expect(list.body[0].nextDue).toBeDefined();

    const swept = await request(app).post('/api/maintenance-plans/run-sweep').set('Cookie', cookies);
    expect(swept.status).toBe(200);
    expect(swept.body.created).toBe(1);
  });

  it('rejects plan creation by Technician', async () => {
    const gen = await makeGenerator();
    const { cookies } = await authAs({ email: 'tech@test.com', role: 'Technician' });
    const res = await request(app)
      .post('/api/maintenance-plans')
      .set('Cookie', cookies)
      .send({ generatorId: gen._id, name: 'x', intervalType: 'days', intervalValue: 30 });
    expect(res.status).toBe(403);
  });
});
