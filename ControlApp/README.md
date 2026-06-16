# 📱 Security System: ControlApp

A React Native mobile application built with the Expo framework, serving as the remote control center for the security system.

## Features
- **Remote PC Lock**: Instantly lock the paired Windows PC screen from anywhere in the world.
- **USB Port Control**: Remotely enable or disable USB data ports on the PC to prevent unauthorized data extraction.
- **Stealth Camera Surveillance**: Trigger a silent camera capture. The PC will snap a photo and transmit the base64 image data back to your phone.
- **Service Suspension (OTP)**: Input an OTP provided by the PC UI to securely pause the background service on the PC. This disconnects the PC from the Cloud Relay and saves CPU/RAM.
- **Activity Logging**: View a persistent history of all remote commands executed.
- **QR Code Scanner**: Built-in camera scanner to effortlessly pair with the PC UI.

## Development Setup

### Prerequisites
- Node.js (v18+)
- Expo CLI
- Expo Go App (on iOS/Android device)

### Running Locally
```bash
npm install
npx expo start
```
Scan the QR code printed in the terminal using the Expo Go app on your phone to run the app in development mode.

### Building
To build a standalone APK or AAB for Android:
```bash
eas build -p android --profile preview
```
