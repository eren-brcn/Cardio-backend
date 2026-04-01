# Cardio Backend

This is the API for CardioWeb.

It handles:
- user authentication
- workout storage
- progress data for charts
- personal training programs

## Live API
- Base URL: https://cardio-backend-1-lq31.onrender.com

## Main Capabilities
- JWT auth (register/login)
- User-based workout tracking in MongoDB
- Progress summary endpoint for profile analytics
- Owner-scoped program CRUD
- Exercise and category endpoints used by the frontend
- Account data export and account deletion endpoints
- Health check endpoint for deploy monitoring

## Security and API Guardrails
- `helmet` for secure headers
- CORS allowlist (frontend domain)
- Rate limiting (global + auth routes)
- Request logging with `morgan`

## Stack
- Node.js
- Express 4
- MongoDB + Mongoose
- bcryptjs
- jsonwebtoken

## Environment Variables
Create a `.env` file in the backend root:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_secret
FRONTEND_URL=https://cardio-web.vercel.app
NODE_ENV=production
PORT=10001
```

## Local Development
1. Install dependencies:

```bash
npm install
```

2. Start in development mode:

```bash
npm run dev
```

3. Start in production mode locally (optional):

```bash
npm start
```

## Core Routes
Public:
- GET `/health`
- GET `/categories`
- POST `/auth/register`
- POST `/auth/login`

Authenticated:
- GET `/exercises`
- POST `/exercises`
- DELETE `/exercises/:exerciseId`
- GET `/users/me/workouts`
- POST `/users/me/workouts`
- GET `/users/me/progress`
- GET `/users/me/export`
- DELETE `/users/me`
- GET `/programs`
- POST `/programs`
- GET `/programs/:programId`
- PUT `/programs/:programId`
- DELETE `/programs/:programId`

## Render Notes
- Build command: `npm install`
- Start command: `npm start`
- Set `FRONTEND_URL` to your exact Vercel domain
- Use `/health` after deploy for a quick smoke check
