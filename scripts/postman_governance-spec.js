#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
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

// Postman logo SVG with white/transparent coloring
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
     * Score a spec using Postman CLI governance linting
     */
    async scoreSpecViaPostman(specId) {
        try {
            // First try with JSON output for better parsing
            const { stdout, stderr } = await execPromise(
                `POSTMAN_API_KEY="${this.apiKey}" postman spec lint ${specId} --output json 2>&1`
            );
            
            // Check if spec not found or other error
            if (stderr || stdout.includes('Error:')) {
                return { score: 0, error: `Failed to lint spec: ${stderr || stdout}` };
            }

            let violations = [];
            
            try {
                // Try to parse as JSON
                const results = JSON.parse(stdout);
                
                // Handle the JSON structure from Postman CLI
                if (Array.isArray(results)) {
                    violations = results.map(result => ({
                        severity: result.severity?.toLowerCase() || 'hint'
                    }));
                } else if (results.results && Array.isArray(results.results)) {
                    violations = results.results.map(result => ({
                        severity: result.severity?.toLowerCase() || 'hint'
                    }));
                }
            } catch (parseError) {
                // Fallback to text parsing if JSON fails
                const lines = stdout.split('\n');
                
                for (const line of lines) {
                    // Look for lines that contain severity indicators
                    if (line.includes('│')) {
                        // Check for severity keywords (with or without ANSI codes)
                        const lineClean = line.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI codes
                        
                        if (lineClean.includes('ERROR')) {
                            violations.push({ severity: 'error' });
                        } else if (lineClean.includes('WARNING')) {
                            violations.push({ severity: 'warning' });
                        } else if (lineClean.includes('INFO')) {
                            violations.push({ severity: 'info' });
                        } else if (lineClean.includes('HINT')) {
                            violations.push({ severity: 'hint' });
                        }
                    }
                }
            }
            
            // Calculate score using Postman's governance violation format
            let score = 100;
            
            violations.forEach(violation => {
                const severity = violation.severity || 'hint';
                switch(severity) {
                    case 'error':
                        score -= 10;
                        break;
                    case 'warning':
                    case 'warn':
                        score -= 5;
                        break;
                    case 'info':
                        score -= 1;
                        break;
                    default: // hint
                        score -= 0.05;
                }
            });
            
            return {
                score: Math.max(0, Math.round(score * 100) / 100),
                violations: violations,
                violationCount: violations.length
            };
        } catch (error) {
            return { score: 0, error: error.message };
        }
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
                        violationsCount: result.violationCount || 0,
                        status: result.score >= 70 ? 'PASS' : 'FAIL',
                        error: result.error
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
     * Generate HTML dashboard for governance report
     */
    async generateDashboard(report, workspaceId) {
        const timestamp = new Date().toISOString();
        const passCount = report.filter(api => api.status === 'PASS').length;
        const failCount = report.filter(api => api.status === 'FAIL').length;
        const avgScore = report.length > 0 ? report.reduce((sum, api) => sum + api.score, 0) / report.length : 0;

        // Get team domain for Postman URLs
        const userInfo = await this.getUserInfo();
        const teamDomain = userInfo?.teamDomain || 'postman';

        return `
<!DOCTYPE html>
<html>
<head>
    <title>API Governance Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #212121 0%, #2B2B2B 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
            overflow: hidden;
        }
        .header {
            background: #FF6C37;
            color: white;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            position: relative;
            text-align: center;
        }
        .header-logo {
            position: absolute;
            left: 30px;
            top: 50%;
            transform: translateY(-50%);
            width: 80px;
            height: 80px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }
        .header-content {
            display: inline-block;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 600;
        }
        .header .subtitle {
            margin-top: 10px;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 30px;
            background: #FFF1EB;
            border-bottom: 1px solid #E6E6E6;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #212121;
        }
        .stat-label {
            color: #6B6B6B;
            margin-top: 5px;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 1px;
        }
        .apis {
            padding: 30px;
        }
        .api {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            margin-bottom: 15px;
            background: white;
            border: 2px solid #E6E6E6;
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        .api:hover {
            box-shadow: 0 5px 15px rgba(255, 108, 55, 0.2);
            transform: translateY(-2px);
            border-color: #FF6C37;
        }
        .api-name {
            font-weight: 600;
            font-size: 1.1em;
            color: #212121;
        }
        .api-score {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .score {
            font-size: 1.5em;
            font-weight: bold;
            padding: 8px 16px;
            border-radius: 8px;
        }
        .score.pass {
            background: #FF6C37;
            color: white;
        }
        .score.fail {
            background: #F9F9F9;
            color: #212121;
            border: 2px solid #E6E6E6;
        }
        .score.invalid {
            background: #EB2013;
            color: white;
            font-size: 1.2em;
        }
        .violations {
            color: #6B6B6B;
            font-size: 0.9em;
        }
        .status {
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status.pass {
            background: #FF6C37;
            color: white;
        }
        .status.fail {
            background: #212121;
            color: white;
        }
        .status.invalid {
            background: #EB2013;
            color: white;
            font-weight: 700;
        }
        .postman-btn {
            background: #FF6C37;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.85em;
            font-weight: 600;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin-left: 10px;
        }
        .postman-btn:hover {
            background: #E55A2B;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(255, 108, 55, 0.3);
        }
        .postman-icon {
            width: 16px;
            height: 16px;
        }
        .postman-icon svg {
            width: 16px;
            height: 16px;
        }
        .timestamp {
            text-align: center;
            color: #6B6B6B;
            padding: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">${POSTMAN_LOGO_SVG}</div>
            <div class="header-content">
                <h1>API Governance Dashboard</h1>
                <div class="subtitle">Real-time API Quality Monitoring</div>
            </div>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${report.length}</div>
                <div class="stat-label">Total APIs</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #FFB500">${passCount}</div>
                <div class="stat-label">Passing</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #351C15">${failCount}</div>
                <div class="stat-label">Failing</div>
            </div>
            <div class="stat">
                <div class="stat-value">${avgScore.toFixed(1)}</div>
                <div class="stat-label">Avg Score</div>
            </div>
        </div>
        
        <div class="apis">
            ${report.map(api => {
                const isInvalid = api.score === 0;
                const scoreClass = isInvalid ? 'invalid' : api.status.toLowerCase();
                const postmanUrl = api.id ? 
                    `https://${teamDomain}.postman.co/workspace/${workspaceId}/specification/${api.id}` :
                    '#';
                return `
                <div class="api">
                    <div class="api-name">${api.name}</div>
                    <div class="api-score">
                        <div class="violations">${isInvalid ? 'Invalid specification' : api.violationsCount + ' violations'}</div>
                        <div class="score ${scoreClass}">${isInvalid ? 'Invalid' : api.score + '/100'}</div>
                        <div class="status ${scoreClass}">${isInvalid ? 'INVALID SPEC' : api.status}</div>
                        ${api.id ? `
                        <a href="${postmanUrl}" target="_blank" class="postman-btn">
                            <div class="postman-icon">${POSTMAN_LOGO_SVG}</div>
                            View in Postman
                        </a>
                        ` : ''}
                    </div>
                </div>
            `}).join('')}
        </div>
        
        <div class="timestamp">
            Generated at ${timestamp} • Powered by Postman
        </div>
    </div>
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
            type: 'string'
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
        .option('json', {
            alias: 'j',
            describe: 'Output raw JSON instead of dashboard',
            type: 'boolean',
            default: false
        })
        .help('help')
        .alias('help', 'h')
        .check((argv) => {
            if (!argv.workspace && !argv.spec) {
                throw new Error('Must specify --workspace or --spec');
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
    
    // Check for OUTPUT_FILE environment variable and determine format from extension
    let { workspace: workspaceId, spec: specId, threshold, output: outputFile, json: jsonOutput } = argv;
    
    // If OUTPUT_FILE is set in environment and no --output specified, use it
    if (process.env.OUTPUT_FILE && !outputFile) {
        outputFile = process.env.OUTPUT_FILE;
        // Auto-detect format based on file extension
        const ext = require('path').extname(outputFile).toLowerCase();
        if (ext === '.json') {
            jsonOutput = true;
        } else if (ext === '.html' || ext === '.htm') {
            jsonOutput = false;
        }
        console.log(`Using OUTPUT_FILE from environment: ${outputFile} (format: ${jsonOutput ? 'JSON' : 'HTML'})`);
    }

    try {
        let report;
        
        if (specId) {
            // Score single spec
            const result = await scorer.scoreSpecViaPostman(specId);
            report = [{
                name: 'Spec',
                id: specId,
                score: result.score,
                violationsCount: result.violationCount || 0,
                status: result.score >= threshold ? 'PASS' : 'FAIL'
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

        // Output results
        if (jsonOutput) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            // Generate dashboard - if we have a workspace ID, fetch fresh data from API
            let dashboard;
            if (workspaceId) {
                console.log('Fetching all specs from Postman API and generating dashboard...');
                dashboard = await scorer.generateDashboardFromAPI(workspaceId);
            } else {
                dashboard = await scorer.generateDashboard(report, workspaceId);
            }
            
            if (outputFile) {
                const fs = require('fs');
                fs.writeFileSync(outputFile, dashboard);
                console.log(`Dashboard saved to ${outputFile}`);
            } else {
                console.log(dashboard);
            }
        }

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