import app from './app.js';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🏦 Swiss Bank PERN API Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/actuator/health`);
});
