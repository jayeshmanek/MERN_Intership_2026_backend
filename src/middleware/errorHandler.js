export const errorHandler = (err, req, res, _next) => {
  const status = err.statusCode || 500;
  console.error(`❌ Error [${req.method} ${req.path}]:`, err.message);
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};