/**
 * Global error tracking for frontend
 * Captures unhandled errors and sends them to the backend
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Send error to backend logging endpoint
 */
async function logErrorToBackend(errorData) {
  try {
    const response = await fetch('/api/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...errorData,
        source: 'frontend',
        user_agent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      console.error('Failed to log error to backend:', response.statusText);
    }
  } catch (err) {
    // Silently fail if backend logging fails (don't create error loop)
    console.error('Error logging to backend:', err);
  }
}

/**
 * Setup global error handlers
 */
export function setupErrorTracking() {
  // Handle uncaught errors
  window.onerror = function (message, source, lineno, colno, error) {
    const errorData = {
      message: typeof message === 'string' ? message : String(message),
      url: source || window.location.href,
      line_number: lineno,
      column_number: colno,
      stack_trace: error?.stack || null,
      extra: {
        error_type: 'runtime_error',
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console in development
    if (isDev) {
      console.error('Runtime error:', errorData);
    }

    // Send to backend
    logErrorToBackend(errorData);

    // Return false to allow default error handling
    return false;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function (event) {
    const errorData = {
      message: `Unhandled Promise Rejection: ${event.reason?.message || String(event.reason)}`,
      url: window.location.href,
      stack_trace: event.reason?.stack || null,
      extra: {
        error_type: 'unhandled_promise_rejection',
        reason: String(event.reason),
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console in development
    if (isDev) {
      console.error('Unhandled promise rejection:', errorData);
    }

    // Send to backend
    logErrorToBackend(errorData);
  });

  // Optional: React error boundary integration
  // You can call logErrorToBackend from your error boundaries
  if (typeof window !== 'undefined') {
    window.__logErrorToBackend = logErrorToBackend;
  }
}

/**
 * Manually log an error (useful for error boundaries)
 */
export function logError(error, errorInfo = {}) {
  const errorData = {
    message: error?.message || String(error),
    url: window.location.href,
    stack_trace: error?.stack || null,
    extra: {
      error_type: 'manual_log',
      component_stack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      ...errorInfo,
    },
  };

  // Log to console in development
  if (isDev) {
    console.error('Manual error log:', errorData);
  }

  // Send to backend
  logErrorToBackend(errorData);
}
