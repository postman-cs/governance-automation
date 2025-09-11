// Custom function: Intelligent content type validation
// Only requires content types where they make sense

function contentTypeValidator(targetVal, options, context) {
  const violations = [];
  const method = context.path[context.path.length - 2]; // Get HTTP method
  const contentTypes = Object.keys(targetVal || {});
  
  // Methods that typically need request bodies
  const bodyMethods = ['post', 'put', 'patch'];
  
  if (!bodyMethods.includes(method)) {
    return []; // No validation needed for GET, DELETE, etc.
  }
  
  if (contentTypes.length === 0) {
    // Allow operations without request bodies (some POST operations don't need them)
    return [];
  }
  
  // Check for common content types
  const hasJson = contentTypes.some(ct => ct.includes('application/json'));
  const hasFormData = contentTypes.some(ct => 
    ct.includes('application/x-www-form-urlencoded') || 
    ct.includes('multipart/form-data')
  );
  const hasXml = contentTypes.some(ct => ct.includes('application/xml'));
  
  // Very lenient - just ensure there's some reasonable content type
  if (!hasJson && !hasFormData && !hasXml) {
    violations.push({
      message: `${method.toUpperCase()} operation should specify common content types (JSON, form data, etc.)`
    });
  }
  
  return violations;
}

export default contentTypeValidator;
