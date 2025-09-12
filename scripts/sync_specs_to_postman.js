#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Sync OpenAPI specs to Postman Spec Hub (update existing, create new)
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

class PostmanSpecSyncer {
    constructor(apiKey, workspaceId) {
        this.apiKey = apiKey;
        this.workspaceId = workspaceId;
        this.baseUrl = 'https://api.getpostman.com';
    }

    /**
     * Create a spec in Postman Spec Hub
     */
    async createSpec(name, filePath) {
        try {
            // Read the OpenAPI file
            const content = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            
            // Ensure YAML files have proper extension and clean content
            const isYaml = fileName.toLowerCase().endsWith('.yaml') || fileName.toLowerCase().endsWith('.yml');
            const finalFileName = isYaml ? fileName : fileName.replace(/\.[^.]+$/, '.yaml');
            
            const payload = {
                name: name,
                type: 'OPENAPI:3.0',
                files: [{
                    path: finalFileName,
                    content: content.trim()  // Remove leading/trailing whitespace
                }]
            };

            console.log(`Uploading ${fileName} as ${finalFileName} (${content.length} characters)`);

            const result = await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/specs?workspaceId=${this.workspaceId}`,
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
                    throw new Error(`Failed to create spec: ${response.status} ${error}`);
                }

                return await response.json();
            });
            console.log(`Created spec "${name}" with ID: ${result.id}`);
            return result;

        } catch (error) {
            console.error(`Error creating spec "${name}":`, error.message);
            return null;
        }
    }

    /**
     * List all specs in workspace
     */
    async listSpecs() {
        try {
            return await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/specs?workspaceId=${this.workspaceId}`,
                    {
                        headers: {
                            'X-API-Key': this.apiKey
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to list specs: ${response.status}`);
                }

                const result = await response.json();
                return result.specs || [];
            });

        } catch (error) {
            console.error('Error listing specs:', error.message);
            return [];
        }
    }

    /**
     * Get spec files to find the main file path
     */
    async getSpecFiles(specId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/specs/${specId}/files`,
                {
                    headers: {
                        'X-API-Key': this.apiKey
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get spec files: ${response.status}`);
            }

            const result = await response.json();
            return result.files || [];
        } catch (error) {
            console.error(`Error getting spec files for ${specId}:`, error.message);
            return [];
        }
    }

    /**
     * Update an existing spec file in Postman Spec Hub
     */
    async updateSpec(specId, name, filePath) {
        try {
            // Read the OpenAPI file
            const content = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            
            console.log(`Updating spec "${name}" (${specId}) with ${fileName} (${content.length} characters)`);

            // First get the existing spec files to find the root file path
            const existingFiles = await this.getSpecFiles(specId);
            
            // Find the root file (usually the main OpenAPI file)
            let targetFilePath = fileName;
            const rootFile = existingFiles.find(f => f.type === 'ROOT' || f.name === fileName);
            if (rootFile) {
                targetFilePath = rootFile.path || rootFile.name;
            }

            // Use the correct Postman API endpoint for updating spec files
            const payload = {
                content: content.trim()
                // Note: Only content is allowed, not type or other fields
            };

            const result = await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/specs/${specId}/files/${encodeURIComponent(targetFilePath)}`,
                    {
                        method: 'PATCH',  // Changed from PUT to PATCH
                        headers: {
                            'X-API-Key': this.apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    }
                );

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Failed to update spec file: ${response.status} ${error}`);
                }

                return { id: specId, name: name }; // Return consistent format
            });
            console.log(`Updated spec "${name}" successfully`);
            return result;

        } catch (error) {
            console.error(`Error updating spec "${name}":`, error.message);
            console.log(`Falling back to delete + create for "${name}"...`);
            
            // Fallback: delete and recreate if update fails
            await this.deleteSpec(specId);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for deletion
            return await this.createSpec(name, filePath);
        }
    }

    /**
     * Upload or update a spec (smart upload)
     */
    async uploadOrUpdateSpec(name, filePath) {
        try {
            // First check if spec already exists
            const existingSpecs = await this.listSpecs();
            const existingSpec = existingSpecs.find(s => s.name === name);
            
            if (existingSpec) {
                console.log(`Spec "${name}" already exists, updating...`);
                return await this.updateSpec(existingSpec.id, name, filePath);
            } else {
                console.log(`Creating new spec "${name}"...`);
                return await this.createSpec(name, filePath);
            }
        } catch (error) {
            console.error(`Error in uploadOrUpdateSpec for "${name}":`, error.message);
            return null;
        }
    }

    /**
     * Delete a spec from Postman
     */
    async deleteSpec(specId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/specs/${specId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'X-API-Key': this.apiKey
                    }
                }
            );

            if (!response.ok && response.status !== 404) {
                throw new Error(`Failed to delete spec: ${response.status}`);
            }

            console.log(`Deleted spec: ${specId}`);
            return true;

        } catch (error) {
            console.error(`Error deleting spec ${specId}:`, error.message);
            return false;
        }
    }

    /**
     * List all collections in the workspace
     */
    async listCollections() {
        try {
            return await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/collections?workspace=${this.workspaceId}`,
                    {
                        headers: {
                            'X-API-Key': this.apiKey
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to list collections: ${response.status}`);
                }

                const result = await response.json();
                return result.collections || [];
            });
        } catch (error) {
            console.error('Error listing collections:', error.message);
            return [];
        }
    }

    /**
     * Sync spec with existing collection (better than generating new ones)
     */
    async syncSpecWithCollection(specId, collectionId) {
        try {
            console.log(`Syncing spec ${specId} with existing collection ${collectionId}...`);
            
            const response = await fetch(
                `${this.baseUrl}/specs/${specId}/sync`,
                {
                    method: 'POST',
                    headers: {
                        'X-API-Key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        collectionId: collectionId
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to sync spec with collection: ${response.status} ${error}`);
            }

            console.log(`Spec ${specId} synced with collection successfully`);
            return true;
        } catch (error) {
            console.error(`Error syncing spec with collection:`, error.message);
            return false;
        }
    }

    /**
     * Smart collection management - sync with existing or create new
     */
    async manageCollection(specId, name) {
        try {
            // First check if a collection with this name already exists
            const existingCollections = await this.listCollections();
            const matchingCollection = existingCollections.find(c => 
                c.name === name || c.name.includes(name.replace(' Collection', ''))
            );

            if (matchingCollection) {
                console.log(`Found existing collection "${matchingCollection.name}", syncing with spec...`);
                const synced = await this.syncSpecWithCollection(specId, matchingCollection.uid);
                if (synced) {
                    return { id: matchingCollection.uid, name: matchingCollection.name };
                }
                console.log('Sync failed, falling back to generating new collection...');
            }

            // If no existing collection found or sync failed, generate new one
            return await this.generateNewCollection(specId, name);
        } catch (error) {
            console.error(`Error managing collection for spec ${specId}:`, error.message);
            return null;
        }
    }

    /**
     * Generate a new collection from a spec (only when needed)
     */
    async generateNewCollection(specId, name) {
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

            console.log(`Generating new collection for spec ${specId}...`);

            const response = await fetch(
                `${this.baseUrl}/specs/${specId}/generations/collection`,
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
            console.log(`Collection generation started. Task ID: ${result.taskId}`);
            
            // Poll for task completion
            const collection = await this.pollTaskStatus(specId, result.taskId);
            if (collection) {
                console.log(`Collection "${name}" generated successfully`);
            }
            return collection;

        } catch (error) {
            console.error(`Error generating collection for spec ${specId}:`, error.message);
            return null;
        }
    }

    /**
     * Poll task status until completion
     */
    async pollTaskStatus(specId, taskId, maxAttempts = 30) {
        try {
            for (let i = 0; i < maxAttempts; i++) {
                const response = await fetch(
                    `${this.baseUrl}/specs/${specId}/tasks/${taskId}`,
                    {
                        headers: {
                            'X-API-Key': this.apiKey
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to check task status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.status === 'completed') {
                    return result;
                } else if (result.status === 'failed') {
                    throw new Error(`Task failed: ${result.error || 'Unknown error'}`);
                }
                
                // Wait 2 seconds before polling again
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            throw new Error('Task timeout - exceeded maximum attempts');

        } catch (error) {
            console.error(`Error polling task ${taskId}:`, error.message);
            return null;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Postman Spec Syncer

Usage: node sync_specs_to_postman.js [command] [options]

Commands:
  sync-all                   Sync all specs in specs/ dir (smart update/create)
  upload <file>              Upload/update single OpenAPI spec to Postman  
  list                       List all specs in workspace
  delete <spec-id>           Delete a spec from Postman

Options:
  --with-collections         Generate/sync collections from specs after upload
  --force-create            Force create new specs (skips update attempts)

Environment Variables:
  POSTMAN_API_KEY   Postman API key
  WORKSPACE_ID      Postman workspace ID

Examples:
  node sync_specs_to_postman.js sync-all --with-collections
  node sync_specs_to_postman.js upload specs/github-api.json
        `);
        process.exit(0);
    }

    const apiKey = process.env.POSTMAN_API_KEY;
    const workspaceId = process.env.WORKSPACE_ID;

    if (!apiKey || !workspaceId) {
        console.error('Error: POSTMAN_API_KEY and WORKSPACE_ID environment variables required');
        process.exit(1);
    }

    const syncer = new PostmanSpecSyncer(apiKey, workspaceId);
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
                
                const specResult = await syncer.uploadOrUpdateSpec(name, filePath);
                
                // Generate collection if requested
                if (specResult && args.includes('--with-collections')) {
                    console.log('\nManaging collection from spec...');
                    await syncer.manageCollection(specResult.id, name + ' Collection');
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

                console.log(`Found ${files.length} OpenAPI specs to sync...`);
                const withCollections = args.includes('--with-collections');
                const forceCreate = args.includes('--force-create');

                for (const file of files) {
                    const filePath = path.join(specsDir, file);
                    const specName = path.basename(file, path.extname(file))
                        .replace(/[-_]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                    
                    console.log(`Processing ${file}...`);
                    let specResult;
                    
                    if (forceCreate) {
                        // Force create new spec
                        specResult = await syncer.createSpec(specName, filePath);
                    } else {
                        // Smart sync - update if exists, create if not
                        specResult = await syncer.uploadOrUpdateSpec(specName, filePath);
                    }
                    
                    // Generate collection if requested
                    if (specResult && withCollections) {
                        console.log(`Managing collection for ${specName}...`);
                        await syncer.manageCollection(specResult.id, specName + ' Collection');
                    }
                    
                    // Rate limiting - wait between requests
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                console.log('Sync completed successfully!');
                break;

            case 'list':
                const specs = await syncer.listSpecs();
                console.log(`\nFound ${specs.length} specs in workspace:`);
                specs.forEach(spec => {
                    console.log(`- ${spec.name} (ID: ${spec.id})`);
                });
                break;

            case 'delete':
                const specId = args[1];
                if (!specId) {
                    console.error('Error: Please provide spec ID');
                    process.exit(1);
                }
                await syncer.deleteSpec(specId);
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

module.exports = PostmanSpecSyncer;