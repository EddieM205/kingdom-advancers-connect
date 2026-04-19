/**
 * Error logging utility for debugging app issues in production/TestFlight
 */

export const logError = (context, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    message: error?.message || String(error),
    stack: error?.stack,
    ...additionalData,
  };

  // Console log for debugging
  console.error(`[${context}]`, errorLog);

  // Store in session storage for later inspection (max 5 most recent)
  try {
    const key = 'app_error_log';
    const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
    const logs = [errorLog, ...existing].slice(0, 5);
    sessionStorage.setItem(key, JSON.stringify(logs));
  } catch (e) {
    console.warn('Failed to store error log:', e);
  }
};

export const logInfo = (context, message, data = {}) => {
  console.log(`[${context}] ${message}`, data);
};

export const getErrorLog = () => {
  try {
    return JSON.parse(sessionStorage.getItem('app_error_log') || '[]');
  } catch {
    return [];
  }
};