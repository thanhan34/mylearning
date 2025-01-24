# Google Calendar Integration Setup Guide

This guide explains how to set up the Google Calendar integration for exam tracking.

## Steps to Set Up

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project or select an existing one

3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Click "Create"

5. Generate Service Account Key:
   - Click on the newly created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download the key file

6. Share Calendar:
   - Go to [Google Calendar](https://calendar.google.com)
   - Open settings for the calendar (dtan42@gmail.com)
   - Go to "Share with specific people"
   - Add the service account email (found in the JSON key file)
   - Give "Make changes to events" permission

7. Update Environment Variables:
   - Open your `.env.local` file
   - Set `GOOGLE_CLIENT_EMAIL` to the service account email from the JSON file
   - Set `GOOGLE_PRIVATE_KEY` to the private key from the JSON file
   ```
   GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
   ```

## Testing the Integration

After setting up:
1. Go to the exam tracking form
2. Fill in exam details and submit
3. Check your Google Calendar - you should see a new event created with the exam details

## Troubleshooting

If events are not being created:
1. Check the console for error messages
2. Verify the service account has permission to access the calendar
3. Ensure the environment variables are set correctly
4. Make sure the calendar ID matches your email (dtan42@gmail.com)

## Security Notes

- Keep your service account credentials secure
- Never commit the JSON key file to version control
- Use environment variables for sensitive information
