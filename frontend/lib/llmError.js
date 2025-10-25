/**
 * Detect if an error is due to OpenAI services being down
 */
export function isLLMServiceDown(error) {
  if (!error) return false;
  
  const message = String(error.message || error).toLowerCase();
  const errorString = String(error).toLowerCase();
  
  // Check for common OpenAI service failure patterns
  const patterns = [
    'openai',
    'api error',
    'service unavailable',
    'rate limit',
    'overloaded',
    'timeout',
    '503',
    '502',
    '504',
    '429',
    'model is currently overloaded',
    'try again later',
    'temporarily unavailable',
    'upstream',
  ];
  
  return patterns.some(pattern => 
    message.includes(pattern) || errorString.includes(pattern)
  );
}

/**
 * Get appropriate error message based on error type
 */
export function getLLMErrorMessage(error, fallback = "An unexpected error occurred") {
  if (isLLMServiceDown(error)) {
    return "LLM_SERVICE_DOWN";
  }
  return error?.message || fallback;
}
