const db = require('./db');
const { app, request, createUser, loginCookies } = require('./helpers');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('POST /api/auth/login', () => {
  it('returns a consistent user shape and sets auth cookies', async () => {
    await createUser({ email: 'a@test.com', password: 'secret123', name: 'Ada', role: 'Engineer' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@test.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Ada', email: 'a@test.com', role: 'Engineer' });
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).not.toHaveProperty('fullName');
    expect(res.body.user).not.toHaveProperty('password');

    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/accessToken=/);
    expect(cookies).toMatch(/refreshToken=/);
  });

  it('rejects bad credentials with 401', async () => {
    await createUser({ email: 'b@test.com', password: 'right-password' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'b@test.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects a deactivated account with 403', async () => {
    await createUser({ email: 'c@test.com', password: 'secret123', isActive: false });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'c@test.com', password: 'secret123' });
    expect(res.status).toBe(403);
  });
});

describe('auth cookie lifecycle', () => {
  it('refreshes an active session and rotates the refresh token', async () => {
    await createUser({ email: 'd@test.com', password: 'secret123' });
    const cookies = await loginCookies('d@test.com', 'secret123');

    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/refreshToken=/);
  });

  it('rejects refresh without a token', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(400);
  });
});

describe('protected route guard', () => {
  it('blocks unauthenticated access to /api/generators', async () => {
    const res = await request(app).get('/api/generators');
    expect(res.status).toBe(401);
  });
});
