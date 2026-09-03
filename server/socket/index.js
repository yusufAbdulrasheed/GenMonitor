const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const realtime = require('../services/realtime');

const parseCookies = (header = '') =>
  header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    acc[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    return acc;
  }, {});

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token =
        cookies.accessToken ||
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');

      if (!token) return next(new Error('unauthorized'));

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id).select('_id name role isActive');
      if (!user || !user.isActive) return next(new Error('unauthorized'));

      socket.data.user = { id: String(user._id), name: user.name, role: user.role };
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.join(`user:${user.id}`);
    socket.emit('ready', { user });
  });

  realtime.init(io);
  console.log('[socket] real-time gateway ready');
  return io;
};

module.exports = { initSocket };
