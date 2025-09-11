// Custom function: Flexible security requirement
// Allows either global security or per-operation security

function flexibleSecurityCheck(targetVal, options, context) {
  const violations = [];
  
  // Check if there's global security defined
  if (targetVal.security && targetVal.security.length > 0) {
    return []; // Global security is fine
  }
  
  // Check if there are security schemes defined
  if (!targetVal.components?.securitySchemes && !targetVal.securityDefinitions) {
    violations.push({
      message: "API should define security schemes in components.securitySchemes"
    });
    return violations;
  }
  
  // If no global security, check if operations have security
  if (targetVal.paths) {
    let operationsWithSecurity = 0;
    let totalOperations = 0;
    
    Object.values(targetVal.paths).forEach(pathItem => {
      ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].forEach(method => {
        if (pathItem[method]) {
          totalOperations++;
          if (pathItem[method].security) {
            operationsWithSecurity++;
          }
        }
      });
    });
    
    // Allow if at least 50% of operations have security (flexible)
    const securityCoverage = totalOperations > 0 ? (operationsWithSecurity / totalOperations) : 0;
    
    if (securityCoverage < 0.5) {
      violations.push({
        message: `Only ${Math.round(securityCoverage * 100)}% of operations have security defined. Consider adding global security or per-operation security.`
      });
    }
  }
  
  return violations;
}

export default flexibleSecurityCheck;
