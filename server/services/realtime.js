// Thin wrapper around the Socket.IO server instance. Everything that needs to
// push an event imports this; it is a safe no-op until index.js calls init().

let io = null;

const init = (server) => {
  io = server;
};

const emitAll = (event, payload) => {
  if (io) io.emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
};

const isReady = () => Boolean(io);

module.exports = { init, emitAll, emitToUser, isReady };
