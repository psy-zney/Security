# ☁️ Security System: Cloud

A lightweight Node.js Express server with Socket.IO that routes encrypted commands between the Mobile App and the Windows Background Service.

## Features
- **Bidirectional WebSocket Routing**: Utilizes `socket.io` for high-speed, real-time communication between the paired Mobile and PC clients.
- **End-to-End Security Verification**: Validates HMAC-SHA256 signatures for every incoming message using a shared `SECRET_KEY` to prevent spoofing or unauthorized access.
- **OTA Updates Hosting**: Serves the `version.json` and compiled `.exe` files from the `/public` directory, enabling the PC UI to fetch and install over-the-air updates for the Windows Services.
- **MongoDB Integration**: Validates User authentication and logs all executed commands and device statuses into a persistent NoSQL database.

## Deployment Setup

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/security
```

### Running Locally
```bash
npm install
npm run dev
```

### Production Deployment
This application is designed to be easily deployed on platforms like **Render**, **Heroku**, or an AWS EC2 instance. Ensure you configure the Environment Variables in your hosting provider's dashboard.
```bash
npm start
```
