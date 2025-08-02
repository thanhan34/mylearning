#!/bin/bash

# Script to configure CORS for Firebase Storage
# This script needs to be run with appropriate Firebase project permissions

echo "Setting up CORS configuration for Firebase Storage..."

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "Error: gsutil is not installed. Please install Google Cloud SDK first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if storage.cors.json exists
if [ ! -f "storage.cors.json" ]; then
    echo "Error: storage.cors.json file not found in current directory"
    exit 1
fi

# Get Firebase project ID from environment or prompt user
if [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "Please enter your Firebase project ID:"
    read -r FIREBASE_PROJECT_ID
fi

if [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "Error: Firebase project ID is required"
    exit 1
fi

# Apply CORS configuration
echo "Applying CORS configuration to gs://${FIREBASE_PROJECT_ID}.appspot.com..."

gsutil cors set storage.cors.json gs://${FIREBASE_PROJECT_ID}.appspot.com

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "You can verify the configuration with:"
    echo "gsutil cors get gs://${FIREBASE_PROJECT_ID}.appspot.com"
else
    echo "❌ Failed to apply CORS configuration"
    echo "Please check your permissions and try again"
    exit 1
fi

echo ""
echo "🎉 Firebase Storage CORS setup complete!"
echo "Your voice feedback feature should now work without CORS issues."
