#!/usr/bin/env node

/**
 * Slack Notification Script for API Governance
 * Sends Block Kit messages to Slack channels
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

class SlackNotifier {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    /**
     * Send governance notification to Slack
     */
    async sendGovernanceNotification(apiName, score, violationsCount, postmanLink, details = {}, useWorkflow = false) {
        const status = score >= 70 ? 'Ready for Review' : 'Rejected - Below Threshold';
        const statusEmoji = score >= 70 ? ':white_check_mark:' : ':x:';
        const statusColor = score >= 70 ? 'good' : 'danger';

        // Use simple payload for Slack Workflows
        if (useWorkflow) {
            const payload = {
                api_name: apiName,
                score: score.toString(),
                violations: violationsCount.toString(),
                status: `${statusEmoji} ${status}`,
                link: postmanLink || 'https://app.getpostman.com',
                timestamp: new Date().toLocaleString(),
                submitted_by: details.submittedBy || 'System',
                report_url: details.reportUrl || 'https://dev.azure.com'
            };

            try {
                const response = await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Slack workflow failed: ${response.status} ${response.statusText}`);
                }

                return true;
            } catch (error) {
                console.error('Failed to send Slack workflow notification:', error.message);
                return false;
            }
        }

        // Use Block Kit format for Slack Apps
        const payload = {
            text: `API Governance Review Required: ${apiName}`,
            attachments: [
                {
                    color: statusColor,
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: 'API Governance Review Required'
                            }
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `${statusEmoji} *${status}*`
                            }
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: `*API Name:*\n${apiName}`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Quality Score:*\n${score}/100`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Violations:*\n${violationsCount}`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Submitted By:*\n${details.submittedBy || 'System'}`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Timestamp:*\n${new Date().toLocaleString()}`
                                }
                            ]
                        },
                        {
                            type: 'actions',
                            elements: [
                                {
                                    type: 'button',
                                    text: {
                                        type: 'plain_text',
                                        text: 'Review in Postman'
                                    },
                                    style: 'primary',
                                    url: postmanLink || 'https://app.getpostman.com'
                                },
                                {
                                    type: 'button',
                                    text: {
                                        type: 'plain_text',
                                        text: 'View Full Report'
                                    },
                                    url: details.reportUrl || 'https://dev.azure.com'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
            }

            return true;
        } catch (error) {
            console.error('Failed to send Slack notification:', error.message);
            return false;
        }
    }

    /**
     * Send batch summary notification
     */
    async sendBatchSummary(results, useWorkflow = false) {
        const totalApis = results.length;
        const passedApis = results.filter(r => r.score >= 70).length;
        const failedApis = totalApis - passedApis;
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / totalApis;

        // Use simple payload for Slack Workflows
        if (useWorkflow) {
            const apiDetails = results.slice(0, 5).map(api => {
                const emoji = api.score >= 70 ? '✅' : '❌';
                return `${emoji} ${api.name}: ${api.score}/100`;
            }).join('\n');

            const payload = {
                total_apis: totalApis.toString(),
                passed_apis: passedApis.toString(),
                failed_apis: failedApis.toString(),
                average_score: avgScore.toFixed(1),
                api_details: apiDetails,
                summary: `📊 Batch Report: ${totalApis} APIs processed, ${passedApis} passed, ${failedApis} failed (Avg: ${avgScore.toFixed(1)})`,
                timestamp: new Date().toLocaleString()
            };

            try {
                const response = await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                return response.ok;
            } catch (error) {
                console.error('Failed to send batch summary to workflow:', error.message);
                return false;
            }
        }

        // Create API detail text (limit to first 5) for Block Kit
        const apiDetails = results.slice(0, 5).map(api => {
            const emoji = api.score >= 70 ? ':white_check_mark:' : ':x:';
            return `${emoji} ${api.name}: ${api.score}/100`;
        }).join('\n');

        const payload = {
            text: 'API Governance Batch Report',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: 'API Governance Batch Report'
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Total APIs*\n:file_folder: ${totalApis}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Passed*\n:white_check_mark: ${passedApis}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Failed*\n:x: ${failedApis}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Average Score*\n:chart_with_upwards_trend: ${avgScore.toFixed(1)}`
                        }
                    ]
                },
                {
                    type: 'divider'
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*API Details*\n${apiDetails}`
                    }
                }
            ]
        };

        // Add "show more" if there are more than 5 APIs
        if (results.length > 5) {
            payload.blocks.push({
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `_And ${results.length - 5} more APIs..._`
                    }
                ]
            });
        }

        // Add action buttons
        payload.blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'View Full Dashboard'
                    },
                    style: 'primary',
                    url: 'https://dev.azure.com'
                }
            ]
        });

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            return response.ok;
        } catch (error) {
            console.error('Failed to send batch summary:', error.message);
            return false;
        }
    }

    /**
     * Send simple text notification
     */
    async sendSimpleNotification(message, channel = null) {
        const payload = {
            text: message,
            ...(channel && { channel })
        };

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            return response.ok;
        } catch (error) {
            console.error('Failed to send simple notification:', error.message);
            return false;
        }
    }
}

// CLI Interface
async function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Slack Notifier for API Governance\n\nUsage: $0 [options]')
        .option('webhook', {
            alias: 'w',
            describe: 'Slack webhook URL (or SLACK_WEBHOOK_URL env var)',
            type: 'string'
        })
        .option('api', {
            alias: 'a',
            describe: 'API name',
            type: 'string'
        })
        .option('score', {
            alias: 's',
            describe: 'Quality score (0-100)',
            type: 'number'
        })
        .option('violations', {
            alias: 'v',
            describe: 'Number of violations',
            type: 'number'
        })
        .option('link', {
            alias: 'l',
            describe: 'Postman link for the API',
            type: 'string'
        })
        .option('batch', {
            alias: 'b',
            describe: 'Send batch summary from JSON file',
            type: 'string'
        })
        .option('message', {
            alias: 'm',
            describe: 'Send simple text message',
            type: 'string'
        })
        .option('channel', {
            alias: 'c',
            describe: 'Slack channel (for simple messages)',
            type: 'string'
        })
        .option('workflow', {
            alias: 'wf',
            describe: 'Use Slack Workflow format instead of Block Kit',
            type: 'boolean'
        })
        .example('$0 --webhook https://... --api "Tracking API" --score 85 --violations 3', 'Single API notification')
        .example('$0 --webhook https://... --batch results.json', 'Batch summary')
        .example('$0 --webhook https://... --message "Deployment complete!"', 'Simple message')
        .example('$0 --webhook https://... --workflow --api "API" --score 85', 'Workflow notification')
        .help()
        .alias('help', 'h')
        .check((argv) => {
            if (!argv.webhook && !process.env.SLACK_WEBHOOK_URL) {
                throw new Error('Slack webhook URL required (use --webhook or SLACK_WEBHOOK_URL env var)');
            }
            if (!argv.batch && !argv.api && !argv.message) {
                throw new Error('Must specify either --batch, --api, or --message');
            }
            return true;
        })
        .argv;

    const webhookUrl = argv.webhook || process.env.SLACK_WEBHOOK_URL;
    const notifier = new SlackNotifier(webhookUrl);

    if (argv.batch) {
        // Send batch summary
        const fs = require('fs');
        
        try {
            const results = JSON.parse(fs.readFileSync(argv.batch, 'utf8'));
            const success = await notifier.sendBatchSummary(results, argv.workflow);
            
            if (success) {
                console.log(`Batch summary sent successfully${argv.workflow ? ' (workflow)' : ' (block kit)'}`);
            } else {
                console.error('Failed to send batch summary');
                process.exit(1);
            }
        } catch (error) {
            console.error('Error reading batch file:', error.message);
            process.exit(1);
        }
    } else if (argv.message) {
        // Send simple message
        const success = await notifier.sendSimpleNotification(argv.message, argv.channel);
        
        if (success) {
            console.log('Simple message sent successfully');
        } else {
            console.error('Failed to send simple message');
            process.exit(1);
        }
    } else {
        // Send single API notification
        const apiName = argv.api || 'Unknown API';
        const score = argv.score || 0;
        const violations = argv.violations || 0;
        const link = argv.link;
        
        const success = await notifier.sendGovernanceNotification(
            apiName,
            score,
            violations,
            link,
            {
                submittedBy: process.env.USER || process.env.BUILD_REQUESTEDFOR || 'System',
                reportUrl: process.env.BUILD_URL || process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI
            },
            argv.workflow
        );
        
        if (success) {
            console.log(`Notification sent for ${apiName} (Score: ${score}/100)${argv.workflow ? ' (workflow)' : ' (block kit)'}`);
        } else {
            console.error('Failed to send notification');
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = SlackNotifier;
