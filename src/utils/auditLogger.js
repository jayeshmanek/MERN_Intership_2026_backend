import AuditLog from '../models/AuditLog.js';

export const logAction = async ({ userId, action, entityType, entityId, metadata = {} }) => {
  try {
    await AuditLog.create({ userId, action, entityType, entityId, metadata });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};