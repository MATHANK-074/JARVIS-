import { google } from "googleapis";

/**
 * Fetch upcoming events from the user's Google Calendar
 */
export const fetchUpcomingEvents = async (accessToken) => {
    try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });

        const calendar = google.calendar({ version: "v3", auth });

        // Fetch events from now onwards
        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = response.data.items || [];

        return events.map(event => ({
            id: event.id,
            summary: event.summary,
            description: event.description || "",
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            location: event.location || "",
            status: event.status,
            link: event.htmlLink
        }));
    } catch (error) {
        console.error("Calendar Service Error:", error);
        throw error;
    }
};
