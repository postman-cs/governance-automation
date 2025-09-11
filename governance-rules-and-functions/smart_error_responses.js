// Custom function: Smart error response checking
// More intelligent about which operations need which error responses

function smartErrorResponses(targetVal, options, context) {
  const violations = [];
  const method = context.path[context.path.length - 1];
  const responses = targetVal;
  
  // Define expected error responses based on HTTP method
  const expectedErrors = {
    'get': ['404'], // GET should handle not found
    'post': ['400'], // POST should handle bad request  
    'put': ['400', '404'], // PUT should handle bad request and not found
    'patch': ['400', '404'], // PATCH should handle bad request and not found
    'delete': ['404'] // DELETE should handle not found
  };
  
  const methodExpectedErrors = expectedErrors[method] || [];
  const missingErrors = [];
  
  // Check for missing expected errors
  methodExpectedErrors.forEach(errorCode => {
    if (!responses[errorCode]) {
      missingErrors.push(errorCode);
    }
  });
  
  // Only flag if missing critical errors (be lenient)
  if (missingErrors.length > 0) {
    violations.push({
      message: `${method.toUpperCase()} operation should define error responses: ${missingErrors.join(', ')}`
    });
  }
  
  return violations;
}

export default smartErrorResponses;
