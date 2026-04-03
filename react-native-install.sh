#!/bin/bash

echo "🚀 Installing React Native App Update Packages..."

# Install required packages
echo "📦 Installing react-native-device-info..."
npm install react-native-device-info

echo "📦 Installing rn-fetch-blob..."
npm install rn-fetch-blob

echo "📦 Installing @react-native-community/netinfo..."
npm install @react-native-community/netinfo

echo "📦 Installing react-native-permissions..."
npm install react-native-permissions

# For iOS (if you have iOS)
if [ -d "ios" ]; then
    echo "🍎 Installing iOS pods..."
    cd ios && pod install && cd ..
fi

echo "✅ All packages installed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Add permissions to AndroidManifest.xml"
echo "2. Add AppUpdateManager to your App.js"
echo "3. Test the update system"
echo ""
echo "📖 See AndroidSetup.md for detailed instructions"
