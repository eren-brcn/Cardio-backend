# Cardio Backend

Express + MongoDB backend for CardioWeb. It provides authentication, user workout tracking, progress analytics, and personal program management.

## Live
- API Base URL: https://cardio-backend-1-lq31.onrender.com

## Features
- JWT authentication (register/login)
- User workout storage in MongoDB
- Progress summary endpoint for profile charts
- Personal workout programs (CRUD, owner-scoped)
- Exercise endpoints backed by user workout history
- Built-in categories endpoint
- Security hardening:
  - helmet
  - CORS allowlist
  - auth-specific rate limiting
  - global API rate limiting
  - structured request logging with morgan
- Health endpoint for uptime checks

## Tech Stack
- Node.js
- Express 4
- Mongoose
- bcryptjs
- jsonwebtoken
- cors
- helmet
- express-rate-limit
- morgan

## Environment Variables
Create an .env file:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_secret
FRONTEND_URL=https://cardio-web.vercel.app
NODE_ENV=production
PORT=10001
```

## Run Locally
Install dependencies and start server:

```bash
npm install
npm start
```

Dev mode:

```bash
npm run dev
```

## Core Endpoints
Public:
- GET /health
- GET /categories
- POST /auth/register
- POST /auth/login

Authenticated:
- GET /exercises
- POST /exercises
- DELETE /exercises/:exerciseId
- GET /users/me/workouts
- POST /users/me/workouts
- GET /users/me/progress
- GET /programs
- POST /programs
- GET /programs/:programId
- PUT /programs/:programId
- DELETE /programs/:programId

## Deployment Notes (Render)
- Build command: npm install
- Start command: npm start
- Ensure FRONTEND_URL matches your Vercel domain exactly
- Use /health endpoint to validate deployment status
