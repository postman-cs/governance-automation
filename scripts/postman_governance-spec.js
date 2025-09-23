#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);

// Load environment variables from .env file if present
try {
    require('dotenv').config();
} catch (error) {
    // dotenv not installed or .env file doesn't exist - that's fine
}

/**
 * Postman API Governance Scorer
 * Uses Postman Enterprise API to get governance report and score
 */

// Postman logo SVG
const POSTMAN_LOGO_SVG = `<svg viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M254.953118,144.253071 C263.911504,74.1217108 214.38443,10.0052669 144.381048,1.04688158 C74.3776647,-7.9115038 10.0052669,41.6155696 1.04688158,111.618952 C-7.9115038,181.622335 41.6155696,245.866756 111.618952,254.953118 C181.750312,263.911504 245.866756,214.38443 254.953118,144.253071 Z" fill="#FFFFFF"> </path> <g transform="translate(50.181225, 45.198924)"> <path d="M124.018448,36.9853339 L70.012182,90.9916 L54.7829269,75.7623449 C107.893354,22.6519173 113.140409,27.2590869 124.018448,36.9853339 L124.018448,36.9853339 Z" fill="#FF6C37"> </path> <path d="M70.012182,92.2713693 C69.6282512,92.2713693 69.3722974,92.1433924 69.1163435,91.8874385 L53.7591114,76.6581834 C53.2472037,76.1462757 53.2472037,75.3784141 53.7591114,74.8665063 C107.765378,20.8602402 113.396363,25.9793176 124.78631,36.2174723 C125.042264,36.4734262 125.170241,36.72938 125.170241,37.1133108 C125.170241,37.4972416 125.042264,37.7531955 124.78631,38.0091494 L70.7800436,91.8874385 C70.6520667,92.1433924 70.2681359,92.2713693 70.012182,92.2713693 Z M56.574604,75.7623449 L70.012182,89.1999229 L122.098794,37.1133108 C112.628501,28.6668332 106.229654,26.1072945 56.574604,75.7623449 L56.574604,75.7623449 Z" fill="#FFFFFF"> </path> <path d="M85.497391,106.476809 L70.7800436,91.7594616 L124.78631,37.7531955 C139.247703,52.342566 117.619601,76.0182987 85.497391,106.476809 Z" fill="#FF6C37"> </path> <path d="M85.497391,107.756578 C85.1134602,107.756578 84.8575064,107.628601 84.6015525,107.372648 L69.8842051,92.6553001 C69.6282512,92.3993463 69.6282512,92.1433924 69.6282512,91.7594616 C69.6282512,91.3755308 69.7562282,91.1195769 70.012182,90.8636231 L124.018448,36.857357 C124.530356,36.3454492 125.298217,36.3454492 125.810125,36.857357 C129.137525,39.9288034 130.929203,44.2800191 130.801226,48.7592118 C130.545272,62.9646515 114.420178,81.0093992 86.5212065,107.372648 C86.1372757,107.628601 85.7533449,107.756578 85.497391,107.756578 L85.497391,107.756578 Z M72.5717207,91.7594616 C80.7622445,100.077962 84.2176217,103.405363 85.497391,104.685132 C106.997516,84.2088225 127.857756,63.2206053 127.985733,48.7592118 C128.11371,45.4318115 126.833941,42.1044113 124.658333,39.5448726 L72.5717207,91.7594616 Z" fill="#FFFFFF"> </path> <path d="M55.0388808,76.1462757 L65.9169201,87.024315 C66.172874,87.2802689 66.172874,87.5362228 65.9169201,87.7921767 C65.7889432,87.9201536 65.7889432,87.9201536 65.6609663,87.9201536 L43.1370259,92.7832771 C41.9852335,92.911254 40.961418,92.1433924 40.7054642,90.9916 C40.5774872,90.3517153 40.8334411,89.7118307 41.2173719,89.3278999 L54.2710192,76.2742526 C54.526973,76.0182987 54.9109038,75.8903218 55.0388808,76.1462757 Z" fill="#FF6C37"> </path> <path d="M42.7530951,94.0630464 C40.8334411,94.0630464 39.4256948,92.5273232 39.4256948,90.6076692 C39.4256948,89.7118307 39.8096256,88.8159921 40.4495103,88.1761075 L53.5031576,75.1224602 C54.2710192,74.4825755 55.2948346,74.4825755 56.0626962,75.1224602 L66.9407356,86.0004996 C67.7085972,86.6403842 67.7085972,87.7921767 66.9407356,88.5600383 C66.6847817,88.8159921 66.4288279,88.9439691 66.0448971,89.071946 L43.5209567,93.9350695 C43.2650028,93.9350695 43.009049,94.0630464 42.7530951,94.0630464 L42.7530951,94.0630464 Z M54.65495,77.5540219 L42.1132104,90.0957615 C41.8572566,90.3517153 41.7292796,90.7356461 41.9852335,91.1195769 C42.1132104,91.5035077 42.4971412,91.6314847 42.881072,91.5035077 L63.9972661,86.8963381 L54.65495,77.5540219 Z" fill="#FFFFFF"> </path> <path d="M152.557304,7.03873136 C144.366781,-0.895838537 131.185156,-0.639884669 123.250587,7.67861603 C115.316017,15.9971167 115.57197,29.050764 123.890471,36.9853339 C130.673249,43.5121575 140.911403,44.6639499 148.97395,39.8008264 L134.38458,25.211456 L152.557304,7.03873136 Z" fill="#FF6C37"> </path> <path d="M138.223888,44.0240653 C126.066079,44.0240653 116.211855,34.1698413 116.211855,22.0120326 C116.211855,9.85422391 126.066079,-1.81866161e-14 138.223888,-1.81866161e-14 C143.854873,-1.81866161e-14 149.357881,2.17560788 153.453143,6.14289283 C153.709097,6.39884669 153.837074,6.65480056 153.837074,7.03873136 C153.837074,7.42266217 153.709097,7.67861603 153.453143,7.9345699 L136.176257,25.211456 L149.741812,38.777011 C150.25372,39.2889187 150.25372,40.0567803 149.741812,40.568688 C149.613835,40.696665 149.613835,40.696665 149.485858,40.8246419 C146.158458,42.8722729 142.191173,44.0240653 138.223888,44.0240653 Z M138.223888,2.68751561 C127.473825,2.68751561 118.771394,11.3899471 118.899371,22.1400096 C118.899371,32.890072 127.601802,41.5925035 138.351865,41.4645266 C141.295334,41.4645266 144.238804,40.8246419 146.926319,39.4168956 L133.488741,26.1072945 C133.232787,25.8513406 133.10481,25.5953868 133.10481,25.211456 C133.10481,24.8275252 133.232787,24.5715713 133.488741,24.3156174 L150.63765,7.1667083 C147.182273,4.22323882 142.831057,2.68751561 138.223888,2.68751561 L138.223888,2.68751561 Z" fill="#FFFFFF"> </path> <path d="M152.941235,7.42266217 L152.685281,7.1667083 L134.38458,25.211456 L148.845973,39.6728495 C150.25372,38.777011 151.661466,37.7531955 152.813258,36.6014031 C161.003782,28.5388563 161.003782,15.485209 152.941235,7.42266217 L152.941235,7.42266217 Z" fill="#FF6C37"> </path> <path d="M148.97395,41.0805958 C148.590019,41.0805958 148.334066,40.9526188 148.078112,40.696665 L133.488741,26.1072945 C133.232787,25.8513406 133.10481,25.5953868 133.10481,25.211456 C133.10481,24.8275252 133.232787,24.5715713 133.488741,24.3156174 L151.661466,6.14289283 C152.173374,5.63098509 152.941235,5.63098509 153.453143,6.14289283 L153.837074,6.39884669 C162.411528,14.9733013 162.411528,28.7948101 153.965051,37.4972416 C152.685281,38.777011 151.277535,39.9288034 149.741812,40.8246419 C149.357881,40.9526188 149.101927,41.0805958 148.97395,41.0805958 L148.97395,41.0805958 Z M136.176257,25.211456 L149.101927,38.1371263 C150.125743,37.4972416 151.149558,36.6014031 151.91742,35.8335415 C159.212105,28.5388563 159.596036,16.6370014 152.557304,8.95838537 L136.176257,25.211456 Z" fill="#FFFFFF"> </path> <path d="M126.194056,39.2889187 C123.12261,36.2174723 118.131509,36.2174723 115.060063,39.2889187 L66.8127587,87.5362228 L74.8753055,95.5987696 L125.938102,50.8068428 C129.265502,47.9913502 129.521456,43.0002498 126.705964,39.6728495 C126.45001,39.5448726 126.322033,39.4168956 126.194056,39.2889187 L126.194056,39.2889187 Z" fill="#FF6C37"> </path> <path d="M74.7473286,96.878539 C74.3633978,96.878539 74.1074439,96.750562 73.85149,96.4946082 L65.7889432,88.4320613 C65.2770355,87.9201536 65.2770355,87.152292 65.7889432,86.6403842 L114.036247,38.3930802 C117.619601,34.809726 123.378563,34.809726 126.961918,38.3930802 C130.545272,41.9764343 130.545272,47.7353963 126.961918,51.3187505 C126.833941,51.4467274 126.705964,51.5747044 126.577987,51.7026813 L75.5151902,96.4946082 C75.3872133,96.750562 75.1312594,96.878539 74.7473286,96.878539 L74.7473286,96.878539 Z M68.6044358,87.5362228 L74.8753055,93.8070925 L125.042264,49.7830273 C127.857756,47.4794425 128.11371,43.2562037 125.810125,40.4407111 C123.50654,37.6252186 119.283302,37.3692647 116.467809,39.6728495 C116.339832,39.8008264 116.211855,39.9288034 115.955901,40.0567803 L68.6044358,87.5362228 Z" fill="#FFFFFF"> </path> <path d="M29.8274248,142.438327 C29.3155171,142.694281 29.0595632,143.206189 29.1875401,143.718097 L31.363148,152.932436 C31.8750557,154.212205 31.1071941,155.747929 29.6994479,156.131859 C28.6756324,156.51579 27.52384,156.131859 26.8839553,155.363998 L12.8064926,141.414512 L58.7502118,95.4707927 L74.6193516,95.7267466 L85.3694141,106.476809 C82.8098754,108.652417 67.3246664,123.625718 29.8274248,142.438327 L29.8274248,142.438327 Z" fill="#FF6C37"> </path> <path d="M28.8036093,157.411629 C27.7797938,157.411629 26.7559784,157.027698 26.1160937,156.259836 L12.1666079,142.31035 C11.910654,142.054397 11.7826771,141.798443 11.7826771,141.414512 C11.7826771,141.030581 11.910654,140.774627 12.1666079,140.518673 L58.1103272,94.5749541 C58.366281,94.3190003 58.7502118,94.1910233 59.0061657,94.1910233 L74.8753055,94.4469772 C75.2592363,94.4469772 75.5151902,94.5749541 75.7711441,94.830908 L86.5212065,105.58097 C86.7771604,105.836924 86.9051373,106.220855 86.9051373,106.604786 C86.9051373,106.988717 86.7771604,107.244671 86.3932296,107.500624 L85.497391,108.268486 C71.931836,120.170341 53.5031576,132.072196 30.5952864,143.462143 L32.7708943,152.548505 C33.1548251,154.212205 32.3869635,156.003882 30.8512403,156.899721 C30.0833787,157.283652 29.443494,157.411629 28.8036093,157.411629 Z M14.7261466,141.414512 L27.9077708,154.468159 C28.2917016,155.108044 29.0595632,155.363998 29.6994479,154.980067 C30.3393325,154.596136 30.5952864,153.828275 30.2113556,153.18839 L28.0357477,143.974051 C27.7797938,142.822258 28.2917016,141.798443 29.3155171,141.286535 C51.9674343,129.896588 70.2681359,118.12271 83.705714,106.476809 L74.2354208,97.0065159 L59.5180734,96.750562 L14.7261466,141.414512 Z" fill="#FFFFFF"> </path> <path d="M1.9284532,152.420528 L12.9344695,141.414512 L29.3155171,157.795559 L3.20822254,156.003882 C2.05643013,155.875905 1.28856853,154.85209 1.41654546,153.700298 C1.41654546,153.18839 1.5445224,152.676482 1.9284532,152.420528 L1.9284532,152.420528 Z" fill="#FF6C37"> </path> <path d="M29.3155171,158.947352 L3.0802456,157.155675 C1.16059159,157.027698 -0.119177745,155.363998 0.00879918845,153.444344 C0.136776122,152.676482 0.39272999,151.908621 1.03261466,151.396713 L12.038631,140.390696 C12.5505387,139.878789 13.3184003,139.878789 13.830308,140.390696 L30.2113556,156.771744 C30.5952864,157.155675 30.7232633,157.667583 30.4673095,158.17949 C30.2113556,158.691398 29.8274248,158.947352 29.3155171,158.947352 L29.3155171,158.947352 Z M12.9344695,143.206189 L2.82429173,153.316367 C2.44036093,153.572321 2.44036093,154.212205 2.82429173,154.468159 C2.95226867,154.596136 3.0802456,154.724113 3.33619947,154.724113 L25.9881168,156.259836 L12.9344695,143.206189 Z" fill="#FFFFFF"> </path> <path d="M54.2710192,101.357732 C53.5031576,101.357732 52.9912498,100.717847 52.9912498,100.077962 C52.9912498,99.6940315 53.1192268,99.4380776 53.3751806,99.1821238 L65.7889432,86.7683612 C66.3008509,86.2564534 67.0687125,86.2564534 67.5806203,86.7683612 L75.6431671,94.830908 C76.0270979,95.2148388 76.1550749,95.5987696 76.0270979,96.1106774 C75.899121,96.4946082 75.5151902,96.878539 75.0032825,97.0065159 L54.526973,101.357732 C54.3989961,101.357732 54.2710192,101.357732 54.2710192,101.357732 L54.2710192,101.357732 Z M66.6847817,89.4558768 L58.2383041,97.9023544 L72.059813,94.9588849 L66.6847817,89.4558768 Z" fill="#FFFFFF"> </path> <path d="M74.6193516,95.7267466 L60.5418889,98.798193 C59.5180734,99.0541468 58.494258,98.4142622 58.2383041,97.3904467 C58.1103272,96.750562 58.2383041,96.1106774 58.7502118,95.5987696 L66.5568048,87.7921767 L74.6193516,95.7267466 Z" fill="#FF6C37"> </path> <path d="M60.2859351,100.077962 C58.494258,100.077962 57.0865117,98.670216 57.0865117,96.878539 C57.0865117,95.9827004 57.4704425,95.2148388 57.9823502,94.5749541 L65.7889432,86.7683612 C66.3008509,86.2564534 67.0687125,86.2564534 67.5806203,86.7683612 L75.6431671,94.830908 C76.0270979,95.2148388 76.1550749,95.5987696 76.0270979,96.1106774 C75.899121,96.4946082 75.5151902,96.878539 75.0032825,97.0065159 L60.9258197,100.077962 C60.6698659,100.077962 60.413912,100.077962 60.2859351,100.077962 L60.2859351,100.077962 Z M66.6847817,89.4558768 L59.7740273,96.3666312 C59.5180734,96.6225851 59.5180734,96.878539 59.6460504,97.1344928 C59.7740273,97.3904467 60.0299812,97.5184236 60.413912,97.5184236 L72.1877899,94.9588849 L66.6847817,89.4558768 Z" fill="#FFFFFF"> </path> <path d="M153.069212,19.7084478 C152.813258,18.9405862 151.91742,18.5566554 151.149558,18.8126093 C150.381697,19.0685632 149.997766,19.9644017 150.25372,20.7322633 C150.25372,20.8602402 150.381697,20.9882172 150.381697,21.1161941 C151.149558,22.6519173 150.893604,24.5715713 149.869789,25.9793176 C149.357881,26.6192023 149.485858,27.5150408 149.997766,28.0269485 C150.63765,28.5388563 151.533489,28.4108793 152.045397,27.7709947 C153.965051,25.3394329 154.348981,22.2679865 153.069212,19.7084478 L153.069212,19.7084478 Z" fill="#FFFFFF"> </path> </g> </g> </g></svg>`

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
            
            // Don't retry on 4xx client errors, only on 5xx server errors or network issues
            if (error.message.includes('Failed to fetch workspace specs: 4')) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

class GovernanceScorer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.getpostman.com';
    }

    /**
     * Execute command by redirecting to temp file to avoid all truncation issues
     */
    async executeWithTempFile(command, args, apiKey) {
        const tempFile = path.join(require('os').tmpdir(), `postman-output-${Date.now()}.txt`);
        
        return new Promise((resolve, reject) => {
            // Redirect output to temp file to bypass all buffering/truncation
            const fullCommand = `POSTMAN_API_KEY="${apiKey}" ${command} ${args.join(' ')} > "${tempFile}" 2>&1`;
            
            const child = spawn('sh', ['-c', fullCommand], {
                stdio: ['ignore', 'inherit', 'inherit'],
                env: { ...process.env, POSTMAN_API_KEY: apiKey }
            });
            
            const timeout = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error('Command timeout after 10 minutes'));
            }, 600000);
            
            child.on('close', (code) => {
                clearTimeout(timeout);
                
                try {
                    // Read the complete output from temp file
                    const stdout = fs.readFileSync(tempFile, 'utf8');
                    
                    // Clean up temp file
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (cleanupError) {
                        console.warn(`Failed to cleanup temp file: ${cleanupError.message}`);
                    }
                    
                    resolve({ stdout, stderr: '', code });
                } catch (readError) {
                    reject(new Error(`Failed to read output file: ${readError.message}`));
                }
            });
            
            child.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    /**
     * Score a spec using Postman CLI governance linting with detailed issue extraction
     */
    async scoreSpecViaPostman(specId) {
        try {
            let stdout = '';
            let stderr = '';
            
            try {
                // Try JSON output first (better for parsing)
                let result = await this.executeWithTempFile('postman', ['spec', 'lint', specId, '--output', 'json'], this.apiKey);
                stdout = result.stdout;
                stderr = result.stderr;
                
                console.log(`Temp file JSON result for Spec ${specId}: stdout length=${stdout.length}, exit code=${result.code}`);
                
                // If JSON failed, try regular table output
                if (!stdout || stdout.includes('Error:') || result.code !== 0) {
                    console.log("JSON output failed, trying table format...");
                    result = await this.executeWithTempFile('postman', ['spec', 'lint', specId], this.apiKey);
                    stdout = result.stdout;
                    stderr = result.stderr;
                    console.log(`Temp file table result for Spec ${specId}: stdout length=${stdout.length}, exit code=${result.code}`);
                }
            } catch (error) {
                // Command failed, but check if we got any output
                stdout = error.stdout || error.message || '';
                stderr = error.stderr || '';
                console.warn(`Temp file approach failed for Spec ${specId}: ${error.message}`);
            }
            
            // Check if spec is corrupted/malformed and cannot be linted
            if (stdout.includes('Unable to lint')) {
                // Clean ANSI color codes from error message for better readability
                const cleanError = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
                return { 
                    score: 0, 
                    error: `Spec is malformed and cannot be linted: ${cleanError}`,
                    issues: [],
                    violationCount: 0,
                    summary: { total: 0, error: 0, warn: 0, info: 0, hint: 0 },
                    api: `Spec-${specId}`,
                    timestamp: new Date().toISOString()
                };
            }
            
            // Check if spec not found or other error
            if (stderr || (stdout.includes('Error:') && !stdout.includes('problems'))) {
                return { score: 0, error: `Failed to lint spec: ${stderr || stdout}` };
            }

            let issues = [];
            
            try {
                // Try to parse as JSON first - Postman spec lint JSON has detailed structure
                const results = JSON.parse(stdout);
                
                // Handle the JSON structure from Postman CLI
                if (results.violations && Array.isArray(results.violations)) {
                    issues = results.violations.map(violation => ({
                        severity: this.normalizeSeverity(violation.severity),
                        rule: 'governance-rule',
                        message: violation.issue || 'Governance issue found',
                        path: violation.path || '',
                        line: parseInt(violation['line number']) || 0,
                        column: 0 // Column not provided in spec lint JSON
                    }));
                } else if (Array.isArray(results)) {
                    issues = results.map(result => ({
                        severity: this.normalizeSeverity(result.severity),
                        rule: 'governance-rule',
                        message: result.issue || 'Governance issue found',
                        path: result.path || '',
                        line: parseInt(result['line number']) || 0,
                        column: 0
                    }));
                }
            } catch (parseError) {
                // Fallback to enhanced text parsing if JSON fails
                const { issues: parsedIssues } = this.parseStdoutToIssuesAndSummary(stdout);
                issues = parsedIssues;
            }
            
            const summary = this.summarizeIssues(issues);
            const score = this.computeScore(issues);
            
            console.log(`Parsed ${issues.length} issues for Spec ${specId} (Score: ${score})`);
            
            return {
                score,
                violations: issues, // Keep for backward compatibility
                violationCount: issues.length,
                issues, // Detailed array for HTML template
                summary, // Summary counts for HTML template
                api: `Spec-${specId}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { score: 0, error: error.message };
        }
    }

    /**
     * Normalize severity to consistent lowercase format expected by template
     */
    normalizeSeverity(severity) {
        if (!severity) return 'hint';
        const cleaned = severity.toString().toLowerCase().trim();
        
        // Map various input formats to template expectations
        switch (cleaned) {
            case 'error': 
            case 'errors': 
                return 'error';
            case 'warn':
            case 'warning': 
            case 'warnings':
                return 'warn';
            case 'info':
            case 'information':
                return 'info';
            case 'hint':
            case 'hints':
            default:
                return 'hint';
        }
    }

    /**
     * Parse stdout table format to extract detailed issues and summary
     * Handles multiple tables (Governance, Security, etc.)
     */
    parseStdoutToIssuesAndSummary(stdout) {
        const clean = stdout.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI codes
        const lines = clean.split('\n');
        const issues = [];
        let currentValidationType = 'governance';

        // Parse all table rows across multiple validation types
        for (const line of lines) {
            // Detect validation type headers
            if (line.includes('Validation Type:')) {
                const typeMatch = line.match(/Validation Type:\s*(\w+)/i);
                if (typeMatch) {
                    currentValidationType = typeMatch[1].toLowerCase();
                }
                continue;
            }
            
            if (!line.includes('│')) continue;
            
            const row = line.split('│').map(s => s.trim()).filter(Boolean);
            
            // Skip headers and separators
            if (row.some(cell => cell.includes('Range') || cell.includes('Severity') || cell.includes('─'))) {
                continue;
            }
            
            // Expected columns: Range, Severity, Description, Path (Path may be empty)
            if (row.length >= 3) {
                const [range, severity, description, pathStr = ''] = row;
                
                // Extract line and column from range (e.g., "4:12")
                let line = 0, column = 0;
                const rangeMatch = range.match(/^(\d+):(\d+)$/);
                if (rangeMatch) {
                    line = parseInt(rangeMatch[1]);
                    column = parseInt(rangeMatch[2]);
                }
                
                // Normalize severity to match template expectations
                const normalizedSeverity = this.normalizeSeverity(severity);
                
                issues.push({
                    severity: normalizedSeverity,
                    rule: `${currentValidationType}-rule`, // Include validation type in rule
                    message: description || '',
                    path: pathStr || '',
                    line: line,
                    column: column
                });
            }
        }

        // If table parsing failed, try to extract from summary line
        if (issues.length === 0) {
            const summaryRegex = /.*?(\d+)\s+problems?\s*\((\d+)\s+errors?,\s*(\d+)\s+warnings?,\s*(\d+)\s+infos?,\s*(\d+)\s+hints?\)/;
            const summaryMatch = clean.match(summaryRegex);
            if (summaryMatch) {
                const [, , errors, warnings, infos, hints] = summaryMatch;
                
                // Create generic issues based on counts
                for (let i = 0; i < parseInt(errors); i++) {
                    issues.push({ severity: 'error', rule: 'governance-rule', message: 'Governance error', path: '', line: 0, column: 0 });
                }
                for (let i = 0; i < parseInt(warnings); i++) {
                    issues.push({ severity: 'warn', rule: 'governance-rule', message: 'Governance warning', path: '', line: 0, column: 0 });
                }
                for (let i = 0; i < parseInt(infos); i++) {
                    issues.push({ severity: 'info', rule: 'governance-rule', message: 'Governance info', path: '', line: 0, column: 0 });
                }
                for (let i = 0; i < parseInt(hints); i++) {
                    issues.push({ severity: 'hint', rule: 'governance-rule', message: 'Governance hint', path: '', line: 0, column: 0 });
                }
            }
        }

        const summary = this.summarizeIssues(issues);
        return { issues, summary };
    }

    /**
     * Create summary counts from detailed issues
     */
    summarizeIssues(issues) {
        const summary = { total: issues.length, error: 0, warn: 0, info: 0, hint: 0 };
        for (const issue of issues) {
            // Use normalized severity for consistent counting
            const normalizedSeverity = this.normalizeSeverity(issue.severity);
            if (normalizedSeverity === 'error') summary.error++;
            else if (normalizedSeverity === 'warn') summary.warn++;
            else if (normalizedSeverity === 'info') summary.info++;
            else summary.hint++;
        }
        return summary;
    }

    /**
     * Compute score from detailed issues
     */
    computeScore(issues) {
        let score = 100;
        for (const issue of issues) {
            // Use normalized severity for consistent scoring
            const normalizedSeverity = this.normalizeSeverity(issue.severity);
            switch (normalizedSeverity) {
                case 'error': score -= 10; break;
                case 'warn': score -= 2.5; break;
                case 'info': score -= 0.5; break;
                default: score -= 0.05; // hint
            }
        }
        return Math.max(0, Math.round(score * 100) / 100);
    }

    /**
     * Get governance report for all specs in a workspace
     */
    async getWorkspaceGovernanceReport(workspaceId) {
        try {
            // Get all specs in workspace using Postman Specs API with retry logic
            const specs = await retryWithBackoff(async () => {
                const response = await fetch(
                    `${this.baseUrl}/specs?workspaceId=${workspaceId}`,
                    {
                        headers: {
                            'X-API-Key': this.apiKey
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch workspace specs: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                return data.specs || [];
            });
            
            const governanceReport = [];
            
            for (const spec of specs) {
                try {
                    const result = await this.scoreSpecViaPostman(spec.id);
                    governanceReport.push({
                        name: spec.name,
                        id: spec.id,
                        score: result.score,
                        violationsCount: result.violationCount || (result.issues?.length ?? 0),
                        status: result.score >= 70 ? 'PASS' : 'FAIL',
                        error: result.error,
                        // New fields for per-API HTML:
                        issues: result.issues || [],
                        summary: result.summary || this.summarizeIssues(result.issues || []),
                        api: spec.name,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    // Don't fail the entire report if one spec fails
                    console.warn(`Failed to score spec ${spec.name}: ${error.message}`);
                    governanceReport.push({
                        name: spec.name,
                        id: spec.id,
                        score: 0,
                        violationsCount: 0,
                        status: 'FAIL',
                        error: `Failed to score: ${error.message}`
                    });
                }
            }
            
            return governanceReport;
        } catch (error) {
            throw new Error(`Failed to get workspace governance report: ${error.message}`);
        }
    }

    /**
     * Generate dashboard by fetching all specs from API
     */
    async generateDashboardFromAPI(workspaceId) {
        // First fetch all specs and score them
        const report = await this.getWorkspaceGovernanceReport(workspaceId);
        return await this.generateDashboard(report, workspaceId);
    }

    /**
     * Get authenticated user info to extract team domain
     */
    async getUserInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/me`, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.status}`);
            }

            const data = await response.json();
            return data.user;
        } catch (error) {
            console.warn(`Could not get user info: ${error.message}`);
            return null;
        }
    }

     /**
     * Generate multi-API HTML dashboard for governance report
     */
     async generateDashboard(report, workspaceId, opts = {}) {
        const timestamp = new Date().toISOString();
        const passCount = report.filter(api => api.status === 'PASS').length;
        const failCount = report.filter(api => api.status === 'FAIL').length;
        const avgScore = report.length > 0 ? report.reduce((sum, api) => sum + api.score, 0) / report.length : 0;

        // Calculate aggregate stats across all APIs
        const aggregatedStats = {
            total: report.reduce((sum, api) => sum + (api.summary?.total || 0), 0),
            error: report.reduce((sum, api) => sum + (api.summary?.error || 0), 0),
            warn: report.reduce((sum, api) => sum + (api.summary?.warn || 0), 0),
            info: report.reduce((sum, api) => sum + (api.summary?.info || 0), 0),
            hint: report.reduce((sum, api) => sum + (api.summary?.hint || 0), 0)
        };

        // Prepare data structure for the multi-API template
        const templateData = {
            timestamp,
            totalApis: report.length,
            passCount,
            failCount,
            avgScore,
            aggregatedStats,
            apis: report,
            workspaceId: workspaceId,
            allIssues: report.flatMap(api => 
                (api.issues || []).map(issue => ({
                    ...issue,
                    apiName: api.name,
                    apiStatus: api.status
                }))
            )
        };

        return await this.generateMultiApiHtmlTemplate(templateData);
    }

    /**
     * Generate the multi-API HTML template
     */
    async generateMultiApiHtmlTemplate(data) {
        // Get team domain for Postman URLs
        const userInfo = await this.getUserInfo();
        const teamDomain = userInfo?.teamDomain || 'postman';
        
        // Add teamDomain to data for use in template
        data.teamDomain = teamDomain;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-API Governance Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-content-color: #212121;
            --secondary-content-color: #6B6B6B;
            --tertiary-content-color: #A6A6A6;
            
            --content-color-success: #007F31;
            --content-color-error: #8E1A10;
            --content-color-link: #0265D2;
            
            --border-color-default: #ededed;
            --border-secondary: #E6E6E6;
            
            --background-color-error: #ffebe7;
            --background-color-success: #E5FFF1;
            --background-color-secondary: #f9f9f9;
            --background-color-tertiary: #f2f2f2;
            
            --base-color-brand: #ff6c37;
            --base-color-error: #eb2013;
            --base-color-success: #0cbb52;
            
            --grey-10: #f2f2f2;
            --red-60: #b02016;
            --red-20: #fbc3ba;
            --red-30: #F79A8E;
            --green-30: #6bdd9a;
            
            --text-secondary: #6b6b6b;
            --text-muted: #929292;
            
            --font-weight-regular: 400;
            --font-weight-medium: 500;
            --font-weight-semibold: 600;
            
            --font-primary: Inter, serif;
            --font-secondary: IBM Plex Mono, monospace;
            
            --section-border: 1px solid var(--border-secondary);
            --border-radius: 8px;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: var(--font-primary);
            color: var(--primary-content-color);
        }
        
        html {
            height: 100vh;
            font-family: var(--font-primary);
            font-size: 16px;
        }
        
        body {
            margin: 0;
            padding: 0;
            height: 100%;
        }

        a {
            color: #0066cc;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        h3 {
            font-family: var(--font-primary);
            font-size: 16px;
            font-weight: 600;
            line-height: 20px;
            letter-spacing: -0.12px;
            text-align: left;
        }

        /* Header styling */
        .heading-content {
            display: flex;
            flex-direction: column;
            gap: 15px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        .header-container, .content-container {
            padding: 24px 96px 0 96px;
            width: 100%;
            height: 100%;
        }

        .header-tab-container {
            width: 100%;
            border-bottom: 1px solid var(--border-color-default);
            position: sticky;
            top: 0;
            z-index: 10;
            padding: 0 96px;
        }

        .heading-content .heading {
            color: var(--secondary-content-color);
            font-weight: 500;
            text-transform: capitalize;
            letter-spacing: 2px;
            font-size: 12px;
        }

        .heading-content .report-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-width: 100%;
            margin-bottom: 20px;
        }

        .report-info .collection-name {
            color: var(--primary-content-color);
            font-weight: 600;
            font-size: 28px;
            letter-spacing: -0.4px;
            line-height: 1.3;
            min-height: 0;
        }

        .report-info .collection-time {
            color: var(--tertiary-content-color);
            font-weight: 400;
            font-size: 16px;
            letter-spacing: -0.4px;
            white-space: nowrap;
            flex-shrink: 0;
            line-height: 1.3;
        }

        /* Tab styling */
        .tab {
            display: flex;
            gap: 24px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .tab-button {
            display: inline-block;
            padding: 12px 0 12px 0;
            font-size: 16px;
            color: var(--tertiary-content-color);
            font-weight: 400;
            border: none;
            background: none;
            cursor: pointer;
        }

        .tab-button:hover {
            color: var(--secondary-content-color);
        }

        .tab-button.active {
            color: var(--primary-content-color);
            box-shadow: inset 0 -3px 0 var(--base-color-brand);
            font-weight: 500;
        }

        .tab-content {
            display: none;
        }

        .tab-content.tab-summary {
            display: block;
        }

        /* Content containers */
        .summary-content {
            display: flex;
            flex-direction: column;
            gap: 24px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        .all-issues-content {
            display: flex;
            gap: 24px;
            flex-direction: column;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        /* Overview container */
        .overview-container {
            padding: 16px;
            border: var(--section-border);
            border-radius: var(--border-radius);
        }

        .run-info-container {
            display: grid;
            grid-template-columns: 25% 25% 25% 25%;
            gap: 4px;
        }

        .overview-container .overview-data-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .overview-data-container .overview-data-title {
            color: var(--tertiary-content-color);
            font-weight: 400;
            font-size: 12px;
        }

        .overview-data-container .overview-data-content {
            color: var(--primary-content-color);
            font-size: 14px;
            font-weight: 400;
            padding-right: 10px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            max-width: 200px;
        }

        /* Stats cards */
        .stats-container {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .stats-container .stats-data-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 16px 12px 16px 12px;
            width: 200px;
            gap: 20px;
            border-radius: 8px;
            border: 1px solid var(--border-color-default);
        }

        .stats-data-container .stats-data-title {
            font-size: 12px;
            font-weight: 400;
            line-height: 16px;
            text-align: left;
        }

        .stats-data-container .stats-data-content {
            font-family: IBM Plex Mono, serif;
            font-size: 54px;
            font-weight: 400;
            letter-spacing: -1.6px;
            text-align: left;
            line-height: 45px;
        }

        /* Issue summary table */
        #issue-summary-container {
            padding: 16px;
            border-radius: 8px;
            border: var(--section-border);
        }

        table#summary-table {
            width: 100%;
            border-spacing: 0 10px;
            table-layout: fixed;
            border-radius: 0 !important;
        }

        table#summary-table td, th {
            border-collapse: collapse;
            border-bottom: 1px solid #EDEDEDB2;
            padding: 4px 0;
            height: 40px;
            text-align: left;
            font-weight: 400;
            line-height: 1.5rem;
            word-wrap: break-word;
            word-break: break-word;
            max-height: 150px;
        }

        table#summary-table tr:last-child td, tr:last-child th {
            border-bottom: none;
        }

        table#summary-table .metric-heading {
            text-align: right;
            width: 136px;
        }

        table#summary-table td .content {
            display: inline-block;
            width: fit-content;
            padding: 0 12px;
            border-radius: 4px;
            min-width: 3rem;
            text-align: center;
        }

        table#summary-table th {
            color: var(--secondary-content-color);
        }

        /* Issue containers for All Issues tab */
        .issue-container {
            padding: 16px;
            border: var(--section-border);
            border-radius: var(--border-radius);
            margin-bottom: 12px;
            transition: background-color 0.2s ease;
        }

        .issue-container:hover {
            background: var(--background-color-tertiary);
        }

        .issue-container.error {
            border-color: var(--red-20);
            background: #FFF7F5;
        }

        .issue-container.warn {
            border-color: #FFD6A5;
            background: #FFF8F0;
        }

        .issue-container.info {
            border-color: #B3E5FC;
            background: #F8FDFF;
        }

        /* Filter button styling (MISSING from original) */
        .filter-button {
            background-color: var(--background-color-tertiary);
            border: none;
            text-align: center;
            border-radius: 30px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 600;
            color: var(--secondary-content-color);
            cursor: pointer;
            line-height: 16px;
            max-height: 28px;
        }

        .filter-button:hover {
            background-color: var(--border-color-default);
        }

        .filter-button.selected {
            background-color: #2B2B2B;
            color: #FFF;
        }

        .issue-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .severity-badge {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: var(--font-weight-semibold);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .severity-badge.error {
            background-color: var(--base-color-error);
            color: white;
        }

        .severity-badge.warn {
            background-color: var(--base-color-brand);
            color: white;
        }

        .severity-badge.info {
            background-color: var(--content-color-link);
            color: white;
        }

        .severity-badge.hint {
            background-color: var(--tertiary-content-color);
            color: white;
        }

        .rule-name {
            font-family: var(--font-secondary);
            background: var(--grey-10);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: var(--font-weight-medium);
        }

        .issue-message {
            font-size: 15px;
            line-height: 1.5;
            color: var(--primary-content-color);
            margin-bottom: 8px;
        }

        .issue-location {
            font-family: var(--font-secondary);
            font-size: 12px;
            color: var(--text-muted);
            background: var(--background-color-tertiary);
            padding: 8px 12px;
            border-radius: 4px;
            display: inline-block;
        }

        /* Footer styling (exact copy from original) */
        .footer {
            background-color: var(--background-color-secondary);
            padding: 16px;
            border-radius: 8px;
            display: flex;
            gap: 23px;
            align-items: center;
        }

        .footer .footer-icon-container {
            padding: 0 10px;
        }

        .footer-icon-container .footer-icon {
            width: 122px;
            height: 118px;
        }

        .footer .footer-text-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 637px;
        }

        .footer .footer-title {
            letter-spacing: -0.12px;
            font-size: 16px;
            font-weight: 600;
        }

        .footer .footer-content {
            font-size: 14px;
            font-weight: 400;
            line-height: 20px;
        }

        /* Typography Utilities (MISSING FROM OUR VERSION!) */
        .text-xs { font-size: 11px; }
        .text-sm { font-size: 12px; }
        .text-base { font-size: 14px; }
        .text-lg { font-size: 16px; }

        .font-regular { font-weight: var(--font-weight-regular); }
        .font-medium { font-weight: var(--font-weight-medium); }
        .font-semibold { font-weight: var(--font-weight-semibold); }

        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        .font-primary { font-family: var(--font-primary), serif; }

        /* Text Colors (MISSING!) */
        .text-primary { color: var(--primary-content-color); }
        .text-secondary { color: var(--secondary-content-color); }
        .text-tertiary { color: var(--tertiary-content-color); }
        .text-muted { color: var(--text-muted); }
        .text-error { color: var(--base-color-error); }
        .text-success { color: var(--base-color-success); }

        /* Background Colors (MISSING!) */
        .bg-white { background-color: white; }
        .bg-secondary { background-color: var(--background-color-secondary); }
        .bg-tertiary { background-color: var(--background-color-tertiary); }
        .bg-error { background-color: var(--background-color-error); }
        .bg-success-light { background-color: var(--green-30); }

        /* Layout Utilities (MISSING!) */
        .flex { display: flex; }
        .flex-col { display: flex; flex-direction: column; }
        .flex-row-wrap { display: flex; flex-wrap: wrap; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .full-width { width: 100%; }
        .hidden { visibility: hidden; }

        .gap-2 { gap: 2px; }
        .gap-4 { gap: 4px; }
        .gap-5 { gap: 5px; }
        .gap-8 { gap: 8px; }
        .gap-12 { gap: 12px; }
        .gap-16 { gap: 16px; }

        /* Spacing Utilities (MISSING!) */
        .p-1 { padding: 1px; }
        .p-2 { padding: 2px; }
        .p-3 { padding: 3px; }
        .p-4 { padding: 4px; }
        .p-8 { padding: 8px; }
        .p-12 { padding: 12px; }
        .p-16 { padding: 16px; }
        .p-20 { padding: 20px; }
        .p-24 { padding: 24px; }

        .px-12 { padding-left: 12px; padding-right: 12px; }
        .py-12 { padding-top: 12px; padding-bottom: 12px; }
        .py-16 { padding-top: 16px; padding-bottom: 16px; }

        .mt-16 { margin-top: 16px; }
        .mt-24 { margin-top: 24px; }
        .mb-8 { margin-bottom: 8px; }
        .mr-2 { margin-right: 2px; }

        /* Border Utilities (MISSING!) */
        .border { border: 1px solid; }
        .border-default { border-color: var(--border-color-default); }
        .border-secondary { border-color: var(--border-secondary); }
        .border-error { border-color: var(--red-20); }
        .border-success { border-color: var(--green-30); }

        .rounded { border-radius: 4px; }
        .rounded-lg { border-radius: 8px; }
        .rounded-full { border-radius: 9999px; }

        /* Postman Logo Button */
        .postman-logo-btn {
            background: #FF6C37;
            border: none;
            cursor: pointer;
            padding: 3px;
            border-radius: 4px;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            text-decoration: none;
        }
        
        .postman-logo-btn:hover {
            background: #E55A2B;
            box-shadow: 0 2px 6px rgba(255, 108, 55, 0.3);
        }
        
        .postman-logo-btn svg {
            width: 12px;
            height: 12px;
        }

        /* API Name Link Styling */
        .api-name-link {
            cursor: pointer;
            color: #212121 !important;
            text-decoration-line: underline;
            text-decoration-style: dotted;
            text-underline-offset: auto;
            text-decoration-color: #C6C6C6E3;
            text-decoration-thickness: 13.5%;
            text-underline-position: from-font;
            text-decoration-skip-ink: none;
            font-weight: 500;
        }
        
        .api-name-link:hover {
            text-decoration-color: #FF6C37;
        }

        /* Tooltip System (CRITICAL MISSING PIECE!) */
        .tooltip-cell {
            overflow: visible;
        }
        
        .tooltip-container {
            position: relative;
            width: fit-content;
        }
        
        .tooltip-trigger {
            font-size: 16px;
            font-weight: 400;
            text-align: left;
        }
        
        .tooltip-trigger.underline {
            text-decoration-line: underline;
            text-decoration-style: dotted;
            text-underline-offset: auto;
            text-decoration-color: #C6C6C6E3;
            text-decoration-thickness: 13.5%;
            text-underline-position: from-font;
            text-decoration-skip-ink: none;
        }
        
        .tooltip {
            visibility: hidden;
            position: absolute;
            opacity: 0;
            z-index: 11;
            transition: opacity 0.3s ease, visibility 0s linear 0.3s;
            width: max-content;
            white-space: wrap;
            max-width: 220px;
            top: calc(100% + 4px);
            left: 0;
            border-radius: 2px;
            background-color: var(--background-color-tertiary);
            border: 1px solid rgba(0, 0, 0, 0.08);
            padding: 6px 8px;
            font-size: 11px;
            line-height: 16px;
            font-weight: 400;
            word-wrap: break-word;
            color: var(--primary-content-color);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .tooltip .number {
            font-weight: 600;
        }
        
        .tooltip-container:hover .tooltip {
            visibility: visible;
            opacity: 1;
            transition-delay: 0.3s;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            .header-container, .content-container {
                width: 100%;
                padding: 24px 8px 0 8px;
            }
            
            .heading-content {
                align-items: center;
            }
            
            .tab {
                justify-content: center;
            }
            
            .run-info-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                align-items: center;
            }
            
            .stats-container {
                display: grid;
                grid-template-columns: 49% 49%;
            }
            
            .footer {
                flex-direction: column;
            }
            
            .footer .footer-icon {
                width: 80px;
                height: 90px;
            }
            
            .footer .footer-text-container {
                width: 100%;
            }
        }
    </style>
</head>
<body>
<div>
    <!--Header-->
    <header class="header-container">
        <div class="heading-content">
            <span class="heading">API GOVERNANCE REPORT</span>
            <div class="report-info">
                <div class="tooltip-container text-overflow-tooltip">
                    <span class="collection-name tooltip-trigger">${data.totalApis} APIs Analyzed</span>
                    <div class="tooltip">${data.totalApis} API specifications</div>
                </div>
                <span class="collection-time">
                    ${new Date(data.timestamp).toLocaleString()}
                </span>
            </div>
        </div>
    </header>
    
    <div class="header-tab-container">
        <div class="tab bg-white">
            <button class="tab-button active">
                Summary
            </button>
            <button class="tab-button">
                All Issues
            </button>
        </div>
    </div>

    <!--Content-->
    <div class="content-container no-border">
        <!--Summary Tab-->
        <div class="tab-content tab-summary">
            <div class="summary-content">
                <!--Overview-->
                <div class="overview-container">
                    <div class="run-info-container">
                        <!-- APIs Count -->
                        <div class="overview-data-container">
                            <span class="overview-data-title">APIs</span>
                            <div class="tooltip-container text-overflow-tooltip flex">
                                <span class="overview-data-content tooltip-trigger">${data.totalApis} specifications</span>
                                <div class="tooltip">${data.totalApis} API specifications analyzed</div>
                            </div>
                        </div>
                        
                        <!-- Total Issues -->
                        <div class="overview-data-container">
                            <span class="overview-data-title">Total Issues</span>
                            <span class="overview-data-content font-mono">${data.aggregatedStats.total}</span>
                        </div>
                        
                        <!-- Passing/Failing -->
                        <div class="overview-data-container">
                            <span class="overview-data-title">Status</span>
                            <span class="overview-data-content font-mono">${data.passCount} Pass / ${data.failCount} Fail</span>
                        </div>
                        
                        <!-- Average Score -->
                        <div class="overview-data-container">
                            <span class="overview-data-title">Avg Score</span>
                            <span class="overview-data-content font-mono">${data.avgScore.toFixed(1)}/100</span>
                        </div>
                    </div>
                </div>

                <!--Stats Cards-->
                <div class="stats-container">
                    <div class="stats-data-container">
                        <div class="stats-data-title" style="color: var(--base-color-error);">
                            Errors
                        </div>
                        <div class="stats-data-content" style="color: var(--base-color-error);">
                            ${data.aggregatedStats.error}
                        </div>
                    </div>
                    
                    <div class="stats-data-container">
                        <div class="stats-data-title" style="color: var(--base-color-brand);">
                            Warnings
                        </div>
                        <div class="stats-data-content" style="color: var(--base-color-brand);">
                            ${data.aggregatedStats.warn}
                        </div>
                    </div>
                    
                    <div class="stats-data-container">
                        <div class="stats-data-title" style="color: var(--content-color-link);">
                            Info
                        </div>
                        <div class="stats-data-content" style="color: var(--content-color-link);">
                            ${data.aggregatedStats.info}
                        </div>
                    </div>
                    
                    <div class="stats-data-container">
                        <div class="stats-data-title" style="color: var(--tertiary-content-color);">
                            Hints
                        </div>
                        <div class="stats-data-content" style="color: var(--tertiary-content-color);">
                            ${data.aggregatedStats.hint}
                        </div>
                    </div>
                </div>

                <!--API Summary Table-->
                <div id="issue-summary-container">
                    <h3 style="margin-bottom: 8px;">
                        API Summary
                    </h3>
                    <table id="summary-table">
                        <tr>
                            <th>API</th>
                            <th class="metric-heading">Score</th>
                            <th class="metric-heading">Errors</th>
                            <th class="metric-heading">Warnings</th>
                            <th class="metric-heading">Info</th>
                            <th class="metric-heading">Hints</th>
                        </tr>
                        ${data.apis.map(api => `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${api.id && data.workspaceId && data.teamDomain ? `
                                        <a href="https://${data.teamDomain}.postman.co/workspace/${data.workspaceId}/specification/${api.id}" target="_blank" class="postman-logo-btn" title="View ${api.name} in Postman">
                                            ${POSTMAN_LOGO_SVG}
                                        </a>
                                    ` : `
                                        <button class="postman-logo-btn" onclick="alert('Spec ID or workspace info not available')" title="View in Postman">
                                            ${POSTMAN_LOGO_SVG}
                                        </button>
                                    `}
                                    <span class="api-name-link" onclick="showApiIssues('${api.name}')">${api.name}</span>
                                </div>
                            </td>
                            <td style="text-align: right;">
                                <span class="content font-mono ${api.status === 'PASS' ? '' : 'text-error'}">${api.score}/100</span>
                            </td>
                            <td style="text-align: right;">
                                <span class="content font-mono" style="background: var(--background-color-error); color: var(--base-color-error);">${api.summary?.error || 0}</span>
                            </td>
                            <td style="text-align: right;">
                                <span class="content font-mono" style="background: #FFF8F0; color: var(--base-color-brand);">${api.summary?.warn || 0}</span>
                            </td>
                            <td style="text-align: right;">
                                <span class="content font-mono" style="background: #F8FDFF; color: var(--content-color-link);">${api.summary?.info || 0}</span>
                            </td>
                            <td style="text-align: right;">
                                <span class="content font-mono" style="background: var(--background-color-tertiary); color: var(--tertiary-content-color);">${api.summary?.hint || 0}</span>
                            </td>
                        </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        </div>

        <!--All Issues Tab-->
        <div class="tab-content">
            <div class="all-issues-content">
                <div class="border border-default rounded-lg py-12 px-12">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
                        <!-- Left side: API Filter -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <span class="text-sm text-tertiary">Filter by API</span>
                            <select id="api-filter" style="
                                padding: 6px 12px;
                                border: 1px solid var(--border-color-default);
                                border-radius: 6px;
                                background: white;
                                font-family: var(--font-primary);
                                font-size: 14px;
                                color: var(--primary-content-color);
                                min-width: 200px;
                                cursor: pointer;
                            ">
                                <option value="all">All APIs</option>
                                ${data.apis.map(api => `<option value="${api.name}">${api.name}</option>`).join('')}
                            </select>
                        </div>
                        
                        <!-- Right side: Issue Filter Buttons -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <span class="text-sm text-tertiary">Issues by Severity</span>
                            <div class="flex gap-4">
                                <button class="filter-button selected" data-severity="all">All Issues</button>
                                <button class="filter-button" data-severity="error">Errors Only</button>
                                <button class="filter-button" data-severity="warn">Warnings Only</button>
                                <button class="filter-button" data-severity="info">Info Only</button>
                                <button class="filter-button" data-severity="hint">Hints Only</button>
                            </div>
                        </div>
                    </div>
                        
                    <!-- Divider -->
                    <div style="height: 1px; background: var(--border-color-default); margin: 16px 0"></div>
                </div>
                
                <!-- Issues List -->
                <div class="flex-col gap-8" id="issues-container">
                    ${data.allIssues.map(issue => `
                    <div class="issue-container ${issue.severity}" data-severity="${issue.severity}" data-api="${issue.apiName}">
                        <div class="flex items-center gap-12">
                            <span class="severity-badge ${issue.severity}">
                                ${issue.severity.toUpperCase()}
                            </span>
                            <div class="flex-col gap-8 full-width">
                                <div class="flex items-center gap-8">
                                    <span class="rule-name">${issue.rule || 'governance-rule'}</span>
                                    <span class="api-badge" style="
                                        background: var(--background-color-tertiary);
                                        color: var(--secondary-content-color);
                                        padding: 2px 6px;
                                        border-radius: 12px;
                                        font-size: 10px;
                                        font-weight: 500;
                                        text-transform: uppercase;
                                        letter-spacing: 0.5px;
                                    ">${issue.apiName}</span>
                                </div>
                                <div class="issue-message">${issue.message || 'Governance issue found'}</div>
                                <div class="issue-location">
                                    📍 ${issue.path || 'No path specified'} ${issue.line ? `(Line ${issue.line}${issue.column ? `, Column ${issue.column}` : ''})` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>

    <!--Buffer-->
    <div style="height: 100px"></div>
</div>



<script>
    /**
     * Add footer to each tab content (EXACT copy from original functionality)
     */
    function appendFooterToTabContent() {
        const tabContents = document.querySelectorAll('.tab-content');

        function createUniqueFooter(index) {
            return \`
                <div class="footer-icon-container">
                    <svg class="footer-icon"  viewBox="0 0 122 118" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clip-path="url(#clip0_api_lint)">
                        <path d="M55.2539 43.7202V31.8002C55.2539 30.9302 55.9639 30.2202 56.8339 30.2202H63.7839" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M69.5742 35.52V44.05" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M63.9643 30.3604L69.4443 35.3404L63.9043 35.1504L63.9643 30.3604Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M67.0251 38.5503H57.9551V40.9203H67.0251V38.5503Z" fill="url(#paint0_linear_api_lint)" fill-opacity="0.7"/>
                        <path opacity="0.7" d="M61.0151 33.7402H57.9551V36.1102H61.0151V33.7402Z" fill="url(#paint1_linear_api_lint)"/>
                        <path d="M67.0251 38.5503H57.9551V40.9203H67.0251V38.5503Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M61.0151 33.7402H57.9551V36.1102H61.0151V33.7402Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <g style="mix-blend-mode:multiply" opacity="0.3">
                        <path d="M62.0346 113.68C62.0346 116.07 48.3146 118 31.3846 118C14.4546 118 0.724609 116.06 0.724609 113.68C0.724609 112.49 3.41461 111.42 8.96461 110.71C10.0946 110.57 10.7446 115.22 12.8246 115.04C14.2346 114.92 14.6646 116.8 18.1846 115.77C25.8646 113.52 24.0946 109.27 24.8546 109.23C27.7946 109.1 28.1246 109.35 31.3846 109.35C32.9546 109.35 32.7746 109.35 34.2846 109.31C34.9846 109.29 35.7246 113.14 37.0246 113.96C37.9546 114.55 40.6046 115.39 43.0246 115.28C45.0546 115.19 45.6246 113.32 46.6546 112.79C47.3646 112.42 48.4746 109.4 49.2546 109.47C57.9246 110.23 62.0446 112.13 62.0446 113.68H62.0346Z" fill="#262626"/>
                        </g>
                        <path d="M39.3952 47.3501C37.4652 48.0801 35.4152 48.5401 33.2952 48.7101C33.0352 48.7301 31.8852 48.6201 31.6152 48.6401" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.5549 44.7202L18.6349 43.9602C13.9649 39.8302 11.1649 33.6402 11.6649 26.8102C12.4149 16.5102 20.9149 8.18022 31.2349 7.62022C43.2449 6.97022 53.1749 16.5102 53.1749 28.3802C53.1749 29.4202 53.0649 30.4902 52.8749 31.5602C51.9349 36.6702 49.1149 41.0202 45.2149 44.0802" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <g opacity="0.7">
                        <path d="M18.9344 8.62021C20.5636 8.62021 21.8844 7.29946 21.8844 5.67022C21.8844 4.04098 20.5636 2.72021 18.9344 2.72021C17.3051 2.72021 15.9844 4.04098 15.9844 5.67022C15.9844 7.29946 17.3051 8.62021 18.9344 8.62021Z" fill="#FF6C37"/>
                        </g>
                        <path d="M18.9344 8.62021C20.5636 8.62021 21.8844 7.29946 21.8844 5.67022C21.8844 4.04098 20.5636 2.72021 18.9344 2.72021C17.3051 2.72021 15.9844 4.04098 15.9844 5.67022C15.9844 7.29946 17.3051 8.62021 18.9344 8.62021Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M20.5742 8.12988L21.9442 10.3999" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M39.7249 55.0901L39.1949 52.9901C38.9549 52.0401 39.6749 51.1201 40.6449 51.1201H77.2349C78.1549 51.1201 78.8649 51.9501 78.7149 52.8601L74.2049 80.7301C74.0849 81.4601 73.4649 81.9901 72.7249 81.9901H44.8349C44.1249 81.9901 43.5149 81.5001 43.3649 80.8101L41.3249 71.3401" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M48.6552 39.8502C42.2852 37.7802 38.9352 30.7702 40.1752 24.0202C40.9652 19.7302 44.1852 16.6102 48.4452 15.1602" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M27.1041 33.5804C28.8217 33.5804 30.2141 32.188 30.2141 30.4704C30.2141 28.7527 28.8217 27.3604 27.1041 27.3604C25.3865 27.3604 23.9941 28.7527 23.9941 30.4704C23.9941 32.188 25.3865 33.5804 27.1041 33.5804Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M32.665 86.0502L30.685 86.9602C26.805 88.7402 24.325 92.6202 24.355 96.8902L24.425 108.52C24.455 112.45 21.275 115.65 17.355 115.64C17.055 115.64 16.765 115.64 16.465 115.64C12.635 115.64 9.50501 112.57 9.41501 108.74L9.23501 98.9202C9.10501 95.5002 9.07501 88.8502 9.16501 85.4302C9.46501 73.7002 10.315 60.2402 13.685 49.7902L16.275 41.4502" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M28.5955 65.1602C28.5955 65.1602 17.7355 76.9602 10.4355 67.4502" stroke="#686868" stroke-width="0.97" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M25.2855 61.4702C25.2855 61.4702 16.6055 70.1202 11.1055 62.1502" stroke="#686868" stroke-width="0.97" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9.46533 71.4402L5.84533 71.0802C3.51533 70.8502 1.76533 68.8702 1.78533 66.5302C1.86533 57.8502 5.05533 47.7802 7.24533 41.9402C7.93533 40.0802 10.0153 39.1602 11.8653 39.8902L15.8953 41.4902" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M45.3051 82.02C45.3051 82.02 46.6051 95.26 49.1951 105.77C50.4151 110.71 46.6751 115.48 41.5851 115.48C37.6851 115.48 34.3751 112.61 33.8251 108.75L30.7051 86.97" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M31.9454 48.71C31.9454 48.71 40.5154 58.29 54.5754 62.07C57.9154 62.97 60.0254 66.26 59.3454 69.66C58.6254 73.22 55.0354 75.88 51.5854 74.74C42.1054 71.59 29.7854 68.05 25.5254 61.26" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M13.6855 49.7999C13.6855 49.7999 15.5055 43.7399 23.5355 45.3199C23.5355 45.3199 30.2855 46.77 33.5455 50.32" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M76.6839 44.2803H40.2139C39.8218 44.2803 39.5039 44.5982 39.5039 44.9903V47.5203C39.5039 47.9124 39.8218 48.2303 40.2139 48.2303H76.6839C77.076 48.2303 77.3939 47.9124 77.3939 47.5203V44.9903C77.3939 44.5982 77.076 44.2803 76.6839 44.2803Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M96.2551 17.849L91.4613 15.2158C90.8927 14.9041 90.2017 14.9179 89.6485 15.2572L84.9682 18.0822C84.415 18.4215 84.0822 19.0194 84.0975 19.6704L84.2108 25.1386C84.2261 25.7897 84.5843 26.3736 85.1429 26.685L89.9367 29.3182C90.5054 29.6299 91.1964 29.6161 91.7496 29.2768L96.4298 26.4518C96.9831 26.1125 97.3159 25.5146 97.3005 24.8636L97.1873 19.3954C97.1719 18.7444 96.8138 18.1604 96.2551 17.849Z" fill="url(#paint2_linear_api_lint)" fill-opacity="0.8"/>
                        <path d="M96.2551 17.849L91.4613 15.2158C90.8927 14.9041 90.2017 14.9179 89.6485 15.2572L84.9682 18.0822C84.415 18.4215 84.0822 19.0194 84.0975 19.6704L84.2108 25.1386C84.2261 25.7897 84.5843 26.3736 85.1429 26.685L89.9367 29.3182C90.5054 29.6299 91.1964 29.6161 91.7496 29.2768L96.4298 26.4518C96.9831 26.1125 97.3159 25.5146 97.3005 24.8636L97.1873 19.3954C97.1719 18.7444 96.8138 18.1604 96.2551 17.849Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M76.4576 9.5741L73.9687 8.22233C73.6734 8.0623 73.3156 8.07119 73.03 8.24826L70.6134 9.72267C70.3277 9.89975 70.1568 10.2102 70.1664 10.5473L70.2385 13.3786C70.2481 13.7157 70.435 14.0172 70.725 14.1771L73.2139 15.5288C73.5092 15.6889 73.867 15.68 74.1526 15.5029L76.5692 14.0285C76.8549 13.8514 77.0258 13.541 77.0162 13.2039L76.9441 10.3726C76.9345 10.0355 76.7476 9.73395 76.4576 9.5741Z" fill="url(#paint3_linear_api_lint)" fill-opacity="0.8"/>
                        <path d="M76.4576 9.5741L73.9687 8.22233C73.6734 8.0623 73.3156 8.07119 73.03 8.24826L70.6134 9.72268C70.3277 9.89975 70.1568 10.2102 70.1664 10.5473L70.2385 13.3786C70.2481 13.7157 70.435 14.0172 70.725 14.1771L73.2139 15.5288C73.5092 15.6889 73.867 15.68 74.1526 15.5029L76.5692 14.0285C76.8549 13.8514 77.0258 13.541 77.0162 13.2039L76.9441 10.3726C76.9345 10.0355 76.7476 9.73395 76.4576 9.5741Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M74.7449 40.2199C74.7449 40.2199 73.2649 31.0599 81.3549 26.6499" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M78.1445 34.14C79.1445 32.26 80.7345 30.42 83.2645 29.04" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M95.2145 62.9301C99.3953 62.9301 102.785 59.5498 102.785 55.3801C102.785 51.2103 99.3953 47.8301 95.2145 47.8301C91.0337 47.8301 87.6445 51.2103 87.6445 55.3801C87.6445 59.5498 91.0337 62.9301 95.2145 62.9301Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M95.1337 56.5701C96.7187 56.5701 98.0037 55.2896 98.0037 53.7101C98.0037 52.1306 96.7187 50.8501 95.1337 50.8501C93.5486 50.8501 92.2637 52.1306 92.2637 53.7101C92.2637 55.2896 93.5486 56.5701 95.1337 56.5701Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M90.1152 60.77C90.5352 58.49 92.5352 56.77 94.9352 56.77C97.3352 56.77 99.5352 58.67 99.8052 61.11" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M113.205 15.9701C117.386 15.9701 120.775 12.5899 120.775 8.42012C120.775 4.25037 117.386 0.870117 113.205 0.870117C109.024 0.870117 105.635 4.25037 105.635 8.42012C105.635 12.5899 109.024 15.9701 113.205 15.9701Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M113.124 9.59988C114.709 9.59988 115.994 8.31942 115.994 6.73988C115.994 5.16035 114.709 3.87988 113.124 3.87988C111.539 3.87988 110.254 5.16035 110.254 6.73988C110.254 8.31942 111.539 9.59988 113.124 9.59988Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M108.105 13.8003C108.525 11.5203 110.525 9.80029 112.925 9.80029C115.325 9.80029 117.525 11.7003 117.795 14.1403" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M41.5 48.5V51" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M112.714 37.5401L114.864 38.4401L112.714 39.3401L111.824 41.5001L110.914 39.3401L108.764 38.4501L110.914 37.5501L111.814 35.3901L112.714 37.5401Z" stroke="#686868" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M87.5244 3.47018L89.3144 4.22018L87.5244 4.97018L86.7744 6.76018L86.0244 4.97018L84.2344 4.22018L86.0244 3.47018L86.7644 1.68018L87.5244 3.47018Z" fill="#686868"/>
                        </g>
                        <defs>
                        <linearGradient id="paint0_linear_api_lint" x1="57.9551" y1="39.7403" x2="67.0251" y2="39.7403" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF7002"/>
                        <stop offset="0.2" stop-color="#FC7807"/>
                        <stop offset="0.51" stop-color="#F78E18"/>
                        <stop offset="0.89" stop-color="#EEB332"/>
                        <stop offset="1" stop-color="#EBC03B"/>
                        </linearGradient>
                        <linearGradient id="paint1_linear_api_lint" x1="59.4851" y1="33.7402" x2="59.4851" y2="36.1102" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF6C37"/>
                        <stop offset="1" stop-color="#FFB400"/>
                        </linearGradient>
                        <linearGradient id="paint2_linear_api_lint" x1="87.5501" y1="27.9914" x2="93.8571" y2="16.5324" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF7002"/>
                        <stop offset="0.2" stop-color="#FC7807"/>
                        <stop offset="0.51" stop-color="#F78E18"/>
                        <stop offset="0.89" stop-color="#EEB332"/>
                        <stop offset="1" stop-color="#EBC03B"/>
                        </linearGradient>
                        <linearGradient id="paint3_linear_api_lint" x1="71.9748" y1="14.8476" x2="75.2125" y2="8.89819" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF7002"/>
                        <stop offset="0.2" stop-color="#FC7807"/>
                        <stop offset="0.51" stop-color="#F78E18"/>
                        <stop offset="0.89" stop-color="#EEB332"/>
                        <stop offset="1" stop-color="#EBC03B"/>
                        </linearGradient>
                        <clipPath id="clip0_api_lint">
                        <rect width="120.55" height="117.63" fill="white" transform="translate(0.724609 0.370117)"/>
                        </clipPath>
                        </defs>
                    </svg>
                </div> 
                <div class="footer-text-container">
                    <h4 class="footer-title">
                        View your API lint reports in Postman
                    </h4>
                    <p class="footer-content">
                        Debug faster and improve API quality by viewing lint reports in Postman. Share API analysis with your team and collaborate on fixes right from one place.
                        <a href="https://go.pstmn.io/view-postman-api-lint-results" target="_blank" rel="noopener noreferrer" 
                           style="font-size: 12px;text-decoration-line: underline;text-decoration-style: solid;text-underline-offset: auto;text-decoration-thickness: auto;text-underline-position: from-font;text-decoration-skip-ink: none;">
                            Learn more
                        </a>
                    </p>
                </div>
            \`;
        }

        // Add footer to each tab content (EXACT functionality from original)
        tabContents.forEach((content, index) => {
            const contentContainer = content.firstElementChild,
                  footerContainer = document.createElement('footer');

            footerContainer.classList.add('footer');
            footerContainer.innerHTML = createUniqueFooter(index);
            contentContainer.appendChild(footerContainer);
        });
    }

    /**
     * Update tooltip visibility (CRITICAL missing function from original)
     */
    function updateTooltipVisibility() {
        try {
            const containers = document.querySelectorAll('.tooltip-container.text-overflow-tooltip');

            containers.forEach((container) => {
                const trigger = container.querySelector('.tooltip-trigger');

                if (!trigger) {
                    return;
                }

                if (trigger.offsetParent !== null && trigger.offsetWidth >= trigger.scrollWidth) {
                    container.classList.remove('tooltip-container');
                }
            });
        }
        catch (err) {
            console.error('error managing tooltip visibility', err);
        }
    }

    /**
     * Tab switching functionality (exact copy from original)
     */
    function switchTab(tabIndex) {
        const tab_buttons = document.getElementsByClassName('tab-button'),
              tab_contents = document.getElementsByClassName('tab-content');

        for (let j = 0; j < tab_buttons.length; j++) {
            tab_buttons[j].classList.remove('active');
            tab_contents[j].style.display = 'none';
        }

        tab_buttons[tabIndex].classList.add('active');
        tab_contents[tabIndex].style.display = 'block';
        updateTooltipVisibility(); // CRITICAL: Update tooltips on tab switch
    }

    /**
     * Initialize tab navigation system (exact copy from original)
     */
    function initializeTabs() {
        const tab_buttons = document.getElementsByClassName('tab-button');

        // Activate first tab by default
        tab_buttons[0].classList.add('active');
        document.getElementsByClassName('tab-content')[0].style.display = 'block';

        for (let i = 0; i < tab_buttons.length; i++) {
            tab_buttons[i].addEventListener('click', () => { return switchTab(i); });
        }
    }

    /**
     * Enhanced filtering functionality for multi-API All Issues tab
     */
    function initializeIssueFilters() {
        const filterButtons = document.querySelectorAll('.filter-button');
        const apiFilter = document.getElementById('api-filter');
        const issues = document.querySelectorAll('[data-severity]');

        let currentSeverityFilter = 'all';
        let currentApiFilter = 'all';

        // Severity filter buttons
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update button states
                filterButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                
                currentSeverityFilter = button.dataset.severity;
                applyFilters();
            });
        });

        // API dropdown filter
        if (apiFilter) {
            apiFilter.addEventListener('change', (e) => {
                currentApiFilter = e.target.value;
                applyFilters();
            });
        }

        // Apply both filters
        function applyFilters() {
            issues.forEach(issue => {
                if (issue.classList.contains('filter-button') || issue.classList.contains('api-filter')) return; // Skip filter elements
                
                const matchesSeverity = currentSeverityFilter === 'all' || issue.dataset.severity === currentSeverityFilter;
                const matchesApi = currentApiFilter === 'all' || issue.dataset.api === currentApiFilter;
                
                if (matchesSeverity && matchesApi) {
                    issue.style.display = 'block';
                } else {
                    issue.style.display = 'none';
                }
            });
        }

        // Expose function globally for API name clicks
        window.applyFilters = applyFilters;
        window.currentApiFilter = currentApiFilter;
        window.setApiFilter = function(apiName) {
            currentApiFilter = apiName;
            if (apiFilter) {
                apiFilter.value = apiName;
            }
            applyFilters();
        };
    }

    /**
     * Navigate to All Issues tab and filter by specific API
     */
    function showApiIssues(apiName) {
        // Switch to All Issues tab (tab index 1)
        switchTab(1);
        
        // Apply API filter
        window.setApiFilter(apiName);
    }

    // Initialize all functionality (EXACT pattern from original)
    document.addEventListener('DOMContentLoaded', () => {
        appendFooterToTabContent();
        initializeTabs();
        initializeIssueFilters();
        updateTooltipVisibility(); // CRITICAL: Initialize tooltips like the original
    });
    
    console.log('Multi-API Governance Report Data:', ${JSON.stringify(data, null, 2)});
</script>
</body>
</html>`;
    }
}

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// CLI Interface
async function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Postman API Governance Scorer\n\nUsage: $0 [options]')
        .option('workspace', {
            alias: 'w',
            describe: 'Workspace ID to analyze',
            type: 'string',
            default: process.env.WORKSPACE_ID
        })
        .option('spec', {
            alias: 's',
            describe: 'Single spec ID to analyze',
            type: 'string'
        })
        .option('threshold', {
            alias: 't',
            describe: 'Minimum score threshold',
            type: 'number',
            default: 70
        })
        .option('output', {
            alias: 'o',
            describe: 'Output HTML dashboard to file',
            type: 'string'
        })
        .option('json-output', {
            describe: 'JSON report output file name',
            type: 'string',
            default: process.env.JSON_OUTPUT_FILE || 'governance-report.json'
        })
        .option('html-output', {
            describe: 'HTML dashboard output file name', 
            type: 'string',
            default: process.env.HTML_OUTPUT_FILE || 'governance-dashboard.html'
        })
        .help('help')
        .alias('help', 'h')
        .check((argv) => {
            if (!argv.workspace && !argv.spec) {
                throw new Error('Must specify --workspace or --spec (or set WORKSPACE_ID in .env)');
            }
            return true;
        })
        .argv;

    const apiKey = process.env.POSTMAN_API_KEY;
    if (!apiKey) {
        console.error('Error: POSTMAN_API_KEY environment variable not set');
        process.exit(1);
    }

    const scorer = new GovernanceScorer(apiKey);
    
    // Get output file names from arguments or environment
    let { workspace: workspaceId, spec: specId, threshold, 'json-output': jsonOutputFile, 'html-output': htmlOutputFile, output: legacyOutput } = argv;
    
    // Support legacy --output parameter for backward compatibility
    if (legacyOutput && !htmlOutputFile) {
        htmlOutputFile = legacyOutput;
        console.log(`Using legacy --output parameter: ${htmlOutputFile}`);
    }
    
    console.log(`Output files: JSON=${jsonOutputFile}, HTML=${htmlOutputFile}`);

    try {
        let report;
        
        if (specId) {
            // Score single spec
            const result = await scorer.scoreSpecViaPostman(specId);
            report = [{
                name: `Spec-${specId}`,
                id: specId,
                score: result.score,
                violationsCount: result.violationCount || (result.issues?.length ?? 0),
                status: result.score >= threshold ? 'PASS' : 'FAIL',
                error: result.error,
                // Add the missing fields for HTML template:
                issues: result.issues || [],
                summary: result.summary || scorer.summarizeIssues(result.issues || []),
                api: `Spec-${specId}`,
                timestamp: new Date().toISOString()
            }];
        } else if (workspaceId) {
            // Score entire workspace
            report = await scorer.getWorkspaceGovernanceReport(workspaceId);
        }

        // Check threshold
        const failing = report.filter(api => api.score < threshold);
        if (failing.length > 0) {
            console.error(`\n[FAILED] ${failing.length} APIs below threshold of ${threshold}:`);
            failing.forEach(api => {
                console.error(`  - ${api.name}: ${api.score}/100`);
            });
        }

        // Always generate both JSON report and HTML dashboard
        console.log(`Generating JSON report to ${jsonOutputFile}...`);
        fs.writeFileSync(jsonOutputFile, JSON.stringify(report, null, 2));
        console.log(`JSON report saved to ${jsonOutputFile}`);

        console.log(`Generating HTML dashboard to ${htmlOutputFile}...`);
        let dashboard;
        if (workspaceId) {
            console.log('Fetching all specs from Postman API and generating dashboard...');
            dashboard = await scorer.generateDashboardFromAPI(workspaceId);
        } else {
            dashboard = await scorer.generateDashboard(report, workspaceId);
        }
        fs.writeFileSync(htmlOutputFile, dashboard);
        console.log(`Dashboard saved to ${htmlOutputFile}`);

        // Exit with error if any APIs fail threshold
        if (failing.length > 0) {
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

module.exports = GovernanceScorer;
module.exports.main = main;