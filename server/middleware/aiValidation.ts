// AI Configuration Validation Middleware
// Prevents OpenAI API errors from malformed tool configurations

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Validates OpenAI tools configuration to prevent API errors
 * Checks for common configuration mistakes that cause 400 errors
 */
export function validateOpenAITools(tools: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  tools.forEach((tool, index) => {
    // Check if tool has required 'type' property
    if (!tool.type) {
      errors.push(`Tool at index ${index} is missing required 'type' property`);
    }
    
    // Check if type is 'function'
    if (tool.type && tool.type !== "function") {
      errors.push(`Tool at index ${index} has invalid type '${tool.type}'. Must be 'function'`);
    }
    
    // Check if tool has 'function' property when type is 'function'
    if (tool.type === "function" && !tool.function) {
      errors.push(`Tool at index ${index} is missing required 'function' property`);
    }
    
    // Check function structure
    if (tool.function) {
      if (!tool.function.name) {
        errors.push(`Tool at index ${index} function is missing 'name' property`);
      }
      
      if (!tool.function.description) {
        errors.push(`Tool at index ${index} function is missing 'description' property`);
      }
      
      if (!tool.function.parameters) {
        errors.push(`Tool at index ${index} function is missing 'parameters' property`);
      }
      
      // Validate parameters structure
      if (tool.function.parameters && typeof tool.function.parameters !== 'object') {
        errors.push(`Tool at index ${index} function parameters must be an object`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Auto-corrects common tool configuration issues
 */
export function autoFixToolConfiguration(tools: any[]): OpenAITool[] {
  return tools.map((tool, index) => {
    // If tool is missing type wrapper, auto-fix it
    if (tool.name && !tool.type) {
      console.warn(`Auto-fixing tool at index ${index}: Adding missing type wrapper`);
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || `Function ${tool.name}`,
          parameters: tool.parameters || { type: "object", properties: {}, required: [] }
        }
      };
    }
    
    // If tool has type but malformed function, fix it
    if (tool.type === "function" && !tool.function && tool.name) {
      console.warn(`Auto-fixing tool at index ${index}: Restructuring function definition`);
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || `Function ${tool.name}`,
          parameters: tool.parameters || { type: "object", properties: {}, required: [] }
        }
      };
    }
    
    return tool as OpenAITool;
  });
}

/**
 * Comprehensive tool validation with logging and auto-recovery
 */
export function validateAndFixTools(tools: any[]): OpenAITool[] {
  // First, validate current configuration
  const validation = validateOpenAITools(tools);
  
  if (!validation.isValid) {
    console.error("OpenAI Tools Configuration Errors:", validation.errors);
    
    // Attempt auto-fix
    const fixedTools = autoFixToolConfiguration(tools);
    
    // Re-validate after auto-fix
    const revalidation = validateOpenAITools(fixedTools);
    
    if (revalidation.isValid) {
      console.log("Auto-fix successful: Tools configuration corrected");
      return fixedTools;
    } else {
      console.error("Auto-fix failed. Remaining errors:", revalidation.errors);
      throw new Error(`OpenAI Tools Configuration Invalid: ${revalidation.errors.join(', ')}`);
    }
  }
  
  return tools as OpenAITool[];
}

/**
 * Health check for AI system configuration
 */
export function performAIHealthCheck(): { healthy: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    issues.push("Missing OPENAI_API_KEY environment variable");
  }
  
  // Check API key format
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    issues.push("OPENAI_API_KEY appears to have invalid format");
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
}