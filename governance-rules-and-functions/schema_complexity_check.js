// Custom function: Only flag overly complex schemas for $ref requirement
// This is more lenient than requiring $ref for every schema

function schemaComplexityCheck(targetVal, options, context) {
  // Skip if it's already using $ref
  if (targetVal.$ref) {
    return [];
  }

  // Only flag schemas that are genuinely complex
  const violations = [];
  
  // Check if it's a complex object schema
  if (targetVal.type === 'object' && targetVal.properties) {
    const propertyCount = Object.keys(targetVal.properties).length;
    const hasNestedObjects = Object.values(targetVal.properties).some(prop => 
      prop.type === 'object' || (prop.items && prop.items.type === 'object')
    );
    
    // Only require $ref for very complex schemas (8+ properties AND nested objects)
    if (propertyCount >= 8 && hasNestedObjects) {
      violations.push({
        message: `Complex schema with ${propertyCount} properties and nested objects should use $ref for reusability`
      });
    }
  }
  
  return violations;
}

export default schemaComplexityCheck;
