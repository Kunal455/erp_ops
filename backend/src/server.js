const app = require('./app');
const { config } = require('./config');

const PORT = config.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Mini Operations ERP Backend API running at: http://localhost:${PORT}`);
  console.log(`📑 Swagger Documentation available at: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check available at: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
