# Slack Notification Setup for API Governance

This guide walks you through setting up Slack to receive API governance notifications. Choose one of two approaches:

## 🚀 **Option 1: Slack Workflows (Recommended - Simpler)**
## 🔧 **Option 2: Slack App + Incoming Webhooks (Advanced)**

---

# Option 1: Slack Workflows (Simple Setup)

## Prerequisites
- Slack workspace (no admin required)
- Node.js installed (for running the notifier script)

## Step 1: Create a Workflow

1. In Slack, click your workspace name → **"Tools" → "Workflow Builder"**
2. Click **"Create Workflow"**
3. Choose **"Webhook"** as the trigger
4. Name your workflow: `API Governance Notifications`

## Step 2: Configure Webhook Trigger

1. Add variables for the webhook data:
   - `api_name` (Text)
   - `score` (Text) 
   - `violations` (Text)
   - `status` (Text)
   - `link` (Text)
   - `timestamp` (Text)
   - `submitted_by` (Text) - optional
   - `report_url` (Text) - optional

2. Copy the webhook URL provided

## Step 3: Add Workflow Steps

1. Click **"Add Step"** → **"Send a message"**
2. Choose your target channel (e.g., `#api-governance`)
3. Create your message template:

```
🔔 **API Governance Review Required**

{{status}} 

**API Name:** {{api_name}}
**Quality Score:** {{score}}/100
**Violations:** {{violations}}
**Submitted By:** {{submitted_by}}
**Timestamp:** {{timestamp}}

🔗 **Links:**
Review in Postman: {{link}}
Full Report: {{report_url}}
```

4. **Optional**: Add more workflow steps like:
   - Send to different channels based on score
   - Create calendar reminders  
   - Update Google Sheets

### Alternative Message Templates

**Minimal Template:**
```
{{status}} {{api_name}} scored {{score}}/100 with {{violations}} violations
Review: {{link}}
```

**Detailed Template:**
```
**API Governance Alert**

**{{api_name}}** 
Score: {{score}}/100 | Violations: {{violations}}
Status: {{status}}

Submitted by: {{submitted_by}}
Time: {{timestamp}}

**Actions:**
• [Review in Postman]({{link}})
• [View Full Report]({{report_url}})
```

**Batch Summary Template:**
```
**API Governance Batch Report**

{{summary}}

**Details:**
{{api_details}}

Generated: {{timestamp}}
```

5. **Publish** your workflow

## Step 4: Test the Workflow

```bash
export SLACK_WORKFLOW_URL="https://hooks.slack.com/triggers/YOUR/WORKFLOW/URL"

# Test with curl
curl -X POST "$SLACK_WORKFLOW_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "api_name": "PayPal Payments API",
    "score": "85",
    "violations": "3",
    "status": "Ready for Review",
    "link": "https://app.getpostman.com",
    "timestamp": "'$(date)'",
    "submitted_by": "Developer",
    "report_url": "https://dev.azure.com"
  }'

# Test with the notifier script
./scripts/slack_notifier.js --workflow \
  --api "PayPal Payments API" \
  --score 85 \
  --violations 3 \
  --link "https://app.getpostman.com"
```

---

# Option 2: Slack App + Incoming Webhooks (Advanced)

## Prerequisites
- Slack workspace with admin permissions
- Node.js installed (for running the notifier script)

## Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter app name: `API Governance Bot`
5. Select your workspace
6. Click **"Create App"**

## Step 2: Enable Incoming Webhooks

1. In your app settings, go to **"Features" → "Incoming Webhooks"**
2. Toggle **"Activate Incoming Webhooks"** to **On**
3. Click **"Add New Webhook to Workspace"**
4. Select the channel where you want notifications (e.g., `#api-governance`)
5. Click **"Allow"**

## Step 3: Copy the Webhook URL

1. Copy the webhook URL that appears (starts with `https://hooks.slack.com/services/`)
2. Keep this URL secure - it allows posting to your Slack channel

## Step 4: Test the Integration

### Environment Variable (Recommended)
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### Test with the script
```bash
# Test simple message
./scripts/slack_notifier.js --message "API Governance system is online! 🚀"

# Test API notification
./scripts/slack_notifier.js \
  --api "PayPal Payments API" \
  --score 85 \
  --violations 3 \
  --link "https://app.getpostman.com/your-api"

# Test batch summary (requires a JSON file)
./scripts/slack_notifier.js --batch sample_results.json
```

## Step 5: Integration Examples

### GitHub Actions Integration
```yaml
- name: Notify Slack
  run: |
    ./scripts/slack_notifier.js \
      --api "${{ github.event.repository.name }}" \
      --score "${{ steps.governance.outputs.score }}" \
      --violations "${{ steps.governance.outputs.violations }}" \
      --link "${{ steps.governance.outputs.postman_link }}"
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Azure DevOps Pipeline
```yaml
- script: |
    ./scripts/slack_notifier.js \
      --api "$(API_NAME)" \
      --score "$(GOVERNANCE_SCORE)" \
      --violations "$(VIOLATION_COUNT)" \
      --link "$(POSTMAN_LINK)"
  env:
    SLACK_WEBHOOK_URL: $(SLACK_WEBHOOK_URL)
  displayName: 'Send Slack Notification'
```

## Customization Options

### Message Formatting
The script uses Slack's Block Kit format with:
- Rich formatting with sections and fields
- Color coding (green for pass, red for fail)
- Action buttons for quick access
- Batch summaries with metrics

### Available Commands

```bash
# Single API notification
slack_notifier.js --api "API Name" --score 75 --violations 2 [--link URL]

# Batch summary from JSON
slack_notifier.js --batch results.json

# Simple text message
slack_notifier.js --message "Your message" [--channel "#channel"]

# Help
slack_notifier.js --help
```

### JSON Format for Batch Results
```json
[
  {
    "name": "PayPal Payments API",
    "score": 85,
    "violations": 3
  },
  {
    "name": "Stripe API",
    "score": 92,
    "violations": 1
  }
]
```

## Security Best Practices

1. **Store webhook URLs as secrets** in your CI/CD systems
2. **Use environment variables** instead of hardcoding URLs
3. **Rotate webhook URLs periodically**
4. **Limit channel permissions** appropriately
5. **Monitor webhook usage** in Slack app settings

## Troubleshooting

### Common Issues

**"Slack webhook failed: 403 Forbidden"**
- Check if webhook URL is correct
- Verify the Slack app has permissions
- Ensure the channel still exists

**"Failed to send notification"**
- Check network connectivity
- Verify the JSON payload format
- Test with a simple message first

### Debug Mode
Add debugging to the script by modifying the error handling:
```javascript
console.log('Payload:', JSON.stringify(payload, null, 2));
```

## Advanced Configuration

### Custom Emojis
Update the script to use your workspace's custom emojis:
```javascript
const statusEmoji = score >= 70 ? ':custom_success:' : ':custom_error:';
```

### Multiple Channels
For different notification types, create multiple webhooks:
- `#api-governance-alerts` - Failed APIs
- `#api-governance-summary` - Daily summaries  
- `#api-governance-success` - Passed APIs

### Rate Limiting
Slack allows 1 message per second per webhook. For high-volume notifications, consider:
- Batching notifications
- Using multiple webhooks
- Implementing retry logic


## Which Should You Choose?

### Choose **Slack Workflows** if:
- You want quick setup (5 minutes)
- You don't have admin permissions
- Simple text notifications are sufficient
- You prefer visual workflow builder

### Choose **Slack App + Webhooks** if:
- You want rich, interactive messages
- You need complex formatting and buttons
- You have admin permissions
- You want maximum customization control

---

**Need help?** Check the [Slack Workflows documentation](https://slack.com/help/articles/360035692513-Guide-to-Slack-Workflow-Builder) or [Slack API documentation](https://api.slack.com/messaging/webhooks) or create an issue in this repository.
