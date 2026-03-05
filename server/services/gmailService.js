import { google } from "googleapis";

const getGmailClient = (accessToken) => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.gmail({ version: "v1", auth });
};

/**
 * Fetch the latest N emails for a user
 */
export const fetchRecentEmails = async (accessToken, maxResults = 10) => {
    const gmail = getGmailClient(accessToken);

    try {
        // 1. Get List of message IDs
        const response = await gmail.users.messages.list({
            userId: "me",
            maxResults,
            q: "is:unread", // Fetch only unread emails for task extraction
        });

        const messages = response.data.messages || [];
        const emailData = [];

        // 2. Fetch full content for each message
        for (const msg of messages) {
            const fullMsg = await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "full",
            });

            const headers = fullMsg.data.payload.headers;
            const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
            const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender";

            // Basic snippet or body extraction
            const snippet = fullMsg.data.snippet;

            emailData.push({
                id: msg.id,
                subject,
                from,
                snippet,
                date: fullMsg.data.internalDate,
            });
        }

        return emailData;
    } catch (error) {
        console.error("Gmail Service Error:", error);
        throw error;
    }
};
