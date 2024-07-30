const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config()

const app = express();
app.use(bodyParser.json());


const PORT = process.env.PORT || 3000;

// Jira instance details
const JIRA_BASE_URL = process.env.JIRA_BASE_URL
const JIRA_USERNAME = process.env.JIRA_USERNAME
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN

// Encode Jira username and API token for Basic Auth
const jiraAuth = Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64');

// Function to add a comment to a Jira issue
async function addComment(issueKey, comment) {
    const url = `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/comment`;
    const headers = {
        'Authorization': `Basic ${jiraAuth}`,
        'Content-Type': 'application/json'
    };

    const body = {
        body: comment
    };

    try {
        await axios.post(url, body, { headers });
        console.log(`Comment added to issue ${issueKey}`);
    } catch (error) {
        console.error('Error adding comment to Jira issue:', error);
        throw error;
    }
}

// Handle plan created event
async function handlePlanCreated(event) {
    const { issueKey, userNameScheduledFor, userNameWhoScheduled, dateScheduledStart, dateScheduledEnd } = event;
    const comment = `This issue was scheduled with ${userNameScheduledFor} by ${userNameWhoScheduled} on ${dateScheduledStart} - ${dateScheduledEnd}`;
    await addComment(issueKey, comment);
}

// Handle plan updated event
async function handlePlanUpdated(event) {
    const { issueKey, newUserNameScheduledFor, userNameWhoScheduled, newScheduledStart, newScheduledEnd } = event;
    const comment = `This issue’s plan was updated to be with ${newUserNameScheduledFor} by ${userNameWhoScheduled} on ${newScheduledStart} - ${newScheduledEnd}`;
    await addComment(issueKey, comment);
}

// Handle plan deleted event
async function handlePlanDeleted(event) {
    const { issueKey, userNameScheduledFor, userNameWhoRemoved, listOfDatesScheduled } = event;
    const comment = `Tempo plan was removed for ${userNameScheduledFor} by ${userNameWhoRemoved} on the following dates:\n${listOfDatesScheduled.join('\n')}`;
    await addComment(issueKey, comment);
}

// Webhook endpoint to process events
app.post('/webhook', async (req, res) => {
    const event = req.body;

    try {
        if (event.action === 'create') {
            await handlePlanCreated(event);
        } else if (event.action === 'update') {
            await handlePlanUpdated(event);
        } else if (event.action === 'delete') {
            await handlePlanDeleted(event);
        }

        res.status(200).send('Event processed');
    } catch (error) {
        console.error('Error processing event:', error);
        res.status(500).send('Error processing event');
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
