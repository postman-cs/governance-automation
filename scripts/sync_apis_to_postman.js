#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Sync OpenAPI specs to Postman APIs (update existing, create new)
 */

/**
 * Retry helper for network calls
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                break;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

class PostmanApiSyncer {
    constructor(apiKey, workspaceId) {
        this.apiKey = apiKey;
        this.workspaceId = workspaceId;
        this.baseUrl = 'https://api.getpostman.com';
    }

    /**
     * Create an API in Postman
     */
    async createApi(name, description, filePath) {
        try {
            // Create the API first
            const apiPayload = {
                api: {
                    name: name,
                    summary: description || `API for ${name}`,
                    description: description || `Automatically synced from ${path.basename(filePath)}`
                }
            };

            console.log(`Creating API "${name}"...`);

            const apiResult = await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/apis?workspace=${this.workspaceId}`,
                    {
                        method: 'POST',
                        headers: {
                            'X-API-Key': this.apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(apiPayload)
                    }
                );

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Failed to create API: ${response.status} ${error}`);
                }

                return await response.json();
            });
            
            const apiId = apiResult.api.id;
            console.log(`Created API "${name}" with ID: ${apiId}`);

            // Create version and add schema
            const versionResult = await this.createApiVersionWithSchema(apiId, '1.0.0', filePath);
            if (!versionResult) {
                throw new Error('Failed to create API version with schema');
            }

            return { 
                id: apiId, 
                name: name, 
                versionId: versionResult.id 
            };

        } catch (error) {
            console.error(`Error creating API "${name}":`, error.message);
            return null;
        }
    }

    /**
     * Create an API version with schema
     */
    async createApiVersionWithSchema(apiId, versionName, filePath) {
        try {
            // Create version first
            const versionPayload = {
                version: {
                    name: versionName
                }
            };

            const versionResult = await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/apis/${apiId}/versions`,
                    {
                        method: 'POST',
                        headers: {
                            'X-API-Key': this.apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(versionPayload)
                    }
                );

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Failed to create API version: ${response.status} ${error}`);
                }

                return await response.json();
            });

            const versionId = versionResult.version.id;
            console.log(`Created version "${versionName}" for API ${apiId}`);

            // Add schema to the version
            const schemaResult = await this.updateApiSchema(apiId, versionId, filePath);
            if (!schemaResult) {
                console.warn(`Warning: Failed to update schema for API ${apiId} version ${versionId}`);
            }

            return { id: versionId, name: versionName };

        } catch (error) {
            console.error(`Error creating API version for ${apiId}:`, error.message);
            return null;
        }
    }

    /**
     * Update API schema from file
     */
    async updateApiSchema(apiId, versionId, filePath) {
        try {
            // Read the OpenAPI file
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Determine schema type based on file content
            let schemaType = 'openapi3';
            let schemaLanguage = 'yaml';
            
            try {
                JSON.parse(content);
                schemaLanguage = 'json';
            } catch {
                // It's YAML
                schemaLanguage = 'yaml';
            }

            const schemaPayload = {
                schema: {
                    type: schemaType,
                    language: schemaLanguage,
                    schema: content
                }
            };

            await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/apis/${apiId}/versions/${versionId}/schema`,
                    {
                        method: 'PUT',
                        headers: {
                            'X-API-Key': this.apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(schemaPayload)
                    }
                );

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Failed to update schema: ${response.status} ${error}`);
                }

                return await response.json();
            });

            console.log(`Updated schema for API ${apiId} version ${versionId}`);
            return { success: true };

        } catch (error) {
            console.error(`Error updating API schema for ${apiId}/${versionId}:`, error.message);
            return null;
        }
    }

    /**
     * List all APIs in workspace
     */
    async listApis() {
        try {
            return await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/apis?workspace=${this.workspaceId}`,
                    {
                        headers: {
                            'X-API-Key': this.apiKey
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to list APIs: ${response.status}`);
                }

                const result = await response.json();
                return result.apis || [];
            });

        } catch (error) {
            console.error('Error listing APIs:', error.message);
            return [];
        }
    }

    /**
     * Get API versions
     */
    async listApiVersions(apiId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/apis/${apiId}/versions`,
                {
                    headers: {
                        'X-API-Key': this.apiKey
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to list API versions: ${response.status}`);
            }

            const result = await response.json();
            return result.versions || [];

        } catch (error) {
            console.error(`Error listing API versions for ${apiId}:`, error.message);
            return [];
        }
    }

    /**
     * Update existing API by updating its schema
     */
    async updateApi(apiId, name, description, filePath) {
        try {
            console.log(`Updating API "${name}" (${apiId})`);

            // Get existing versions
            const versions = await this.listApiVersions(apiId);
            let versionId;
            
            if (versions.length > 0) {
                // Use the first version (typically latest)
                versionId = versions[0].id;
                console.log(`Updating existing version ${versions[0].name} (${versionId})`);
            } else {
                // Create a new version if none exist
                const versionResult = await this.createApiVersionWithSchema(apiId, '1.0.0', filePath);
                if (!versionResult) {
                    throw new Error('Failed to create API version');
                }
                versionId = versionResult.id;
            }

            // Update the schema
            const schemaResult = await this.updateApiSchema(apiId, versionId, filePath);
            if (!schemaResult) {
                throw new Error('Failed to update API schema');
            }

            console.log(`Updated API "${name}" successfully`);
            return { id: apiId, name: name, versionId: versionId };

        } catch (error) {
            console.error(`Error updating API "${name}":`, error.message);
            return null;
        }
    }

    /**
     * Upload or update an API (smart upload)
     */
    async uploadOrUpdateApi(name, description, filePath) {
        try {
            // First check if API already exists
            const existingApis = await this.listApis();
            const existingApi = existingApis.find(api => api.name === name);
            
            if (existingApi) {
                console.log(`API "${name}" already exists, updating...`);
                return await this.updateApi(existingApi.id, name, description, filePath);
            } else {
                console.log(`Creating new API "${name}"...`);
                return await this.createApi(name, description, filePath);
            }
        } catch (error) {
            console.error(`Error in uploadOrUpdateApi for "${name}":`, error.message);
            return null;
        }
    }

    /**
     * Delete an API from Postman
     */
    async deleteApi(apiId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/apis/${apiId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'X-API-Key': this.apiKey
                    }
                }
            );

            if (!response.ok && response.status !== 404) {
                throw new Error(`Failed to delete API: ${response.status}`);
            }

            console.log(`Deleted API: ${apiId}`);
            return true;

        } catch (error) {
            console.error(`Error deleting API ${apiId}:`, error.message);
            return false;
        }
    }

    /**
     * Generate collection from API version
     */
    async generateCollectionFromApi(apiId, versionId, name) {
        try {
            const payload = {
                name: name,
                options: {
                    requestNameSource: "Fallback",
                    indentCharacter: "Space",
                    parametersResolution: "Schema",
                    folderStrategy: "Paths",
                    includeAuthInfoInExample: true,
                    enableOptionalParameters: true,
                    keepImplicitHeaders: false,
                    includeDeprecated: true,
                    alwaysInheritAuthentication: false,
                    nestedFolderHierarchy: false
                }
            };

            console.log(`Generating collection for API ${apiId} version ${versionId}...`);

            const response = await fetch(
                `${this.baseUrl}/apis/${apiId}/versions/${versionId}/collections`,
                {
                    method: 'POST',
                    headers: {
                        'X-API-Key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to generate collection: ${response.status} ${error}`);
            }

            const result = await response.json();
            console.log(`Collection "${name}" generated successfully`);
            return result;

        } catch (error) {
            console.error(`Error generating collection for API ${apiId}:`, error.message);
            return null;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Postman API Syncer

Usage: node sync_apis_to_postman.js [command] [options]

Commands:
  sync-all                   Sync all specs in specs/ dir to APIs (smart update/create)
  upload <file>              Upload/update single OpenAPI spec to Postman API
  list                       List all APIs in workspace
  delete <api-id>            Delete an API from Postman

Options:
  --with-collections         Generate collections from APIs after creation
  --force-create            Force create new APIs (skips update attempts)

Environment Variables:
  POSTMAN_API_KEY   Postman API key
  WORKSPACE_ID      Postman workspace ID

Examples:
  node sync_apis_to_postman.js sync-all --with-collections
  node sync_apis_to_postman.js upload specs/github-api.json
        `);
        process.exit(0);
    }

    const apiKey = process.env.POSTMAN_API_KEY;
    const workspaceId = process.env.WORKSPACE_ID;

    if (!apiKey || !workspaceId) {
        console.error('Error: POSTMAN_API_KEY and WORKSPACE_ID environment variables required');
        process.exit(1);
    }

    const syncer = new PostmanApiSyncer(apiKey, workspaceId);
    const command = args[0];

    try {
        switch (command) {
            case 'upload':
                const filePath = args[1];
                if (!filePath) {
                    console.error('Error: Please provide file path');
                    process.exit(1);
                }
                
                const name = path.basename(filePath, path.extname(filePath))
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                
                const description = `API synced from ${path.basename(filePath)}`;
                const apiResult = await syncer.uploadOrUpdateApi(name, description, filePath);
                
                // Generate collection if requested
                if (apiResult && args.includes('--with-collections')) {
                    console.log('\nGenerating collection from API...');
                    await syncer.generateCollectionFromApi(apiResult.id, apiResult.versionId, name + ' Collection');
                }
                break;

            case 'sync-all':
                const specsDir = 'specs';
                if (!fs.existsSync(specsDir)) {
                    console.error(`Error: ${specsDir} directory not found`);
                    process.exit(1);
                }

                const files = fs.readdirSync(specsDir)
                    .filter(file => file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json'));

                console.log(`Found ${files.length} OpenAPI specs to sync to APIs...`);
                const withCollections = args.includes('--with-collections');
                const forceCreate = args.includes('--force-create');

                for (const file of files) {
                    const filePath = path.join(specsDir, file);
                    const apiName = path.basename(file, path.extname(file))
                        .replace(/[-_]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                    
                    const apiDescription = `API synced from ${file}`;
                    console.log(`Processing ${file}...`);
                    let apiResult;
                    
                    if (forceCreate) {
                        // Force create new API
                        apiResult = await syncer.createApi(apiName, apiDescription, filePath);
                    } else {
                        // Smart sync - update if exists, create if not
                        apiResult = await syncer.uploadOrUpdateApi(apiName, apiDescription, filePath);
                    }
                    
                    // Generate collection if requested
                    if (apiResult && withCollections) {
                        console.log(`Generating collection for ${apiName}...`);
                        await syncer.generateCollectionFromApi(apiResult.id, apiResult.versionId, apiName + ' Collection');
                    }
                    
                    // Rate limiting - wait between requests
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                console.log('Sync to APIs completed successfully!');
                break;

            case 'list':
                const apis = await syncer.listApis();
                console.log(`\nFound ${apis.length} APIs in workspace:`);
                apis.forEach(api => {
                    console.log(`- ${api.name} (ID: ${api.id})`);
                });
                break;

            case 'delete':
                const apiId = args[1];
                if (!apiId) {
                    console.error('Error: Please provide API ID');
                    process.exit(1);
                }
                await syncer.deleteApi(apiId);
                break;

            default:
                console.error('Error: Unknown command. Use --help for usage info.');
                process.exit(1);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = PostmanApiSyncer;