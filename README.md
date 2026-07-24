# ArenaTicket Backend API

## Local URLs

- API base: `http://localhost:8089/api/v1`
- Frontend: `http://localhost:3000`

Mock payments are initiated through `POST /api/v1/payments/initiate`. The response
contains the complete browser URL; the frontend should redirect to that value
without rebuilding it:

```text
GET http://localhost:8089/api/v1/mock-payments/esewa?paymentId=<payment-id>&token=<opaque-token>
```

The same route supports `khalti` and `card`. The page reads the amount from the
saved payment and booking; URL-supplied amounts are not accepted.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-880000?logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ArenaTicket Backend API is a production-ready ticket booking system for esports tournaments, built with Node.js, Express, TypeScript, and MongoDB. It powers user authentication, tournament management, ticket booking, payment verification, media uploads, and admin operations through a clean REST API.

## Features

- 🔐 Authentication with JWT, register, login, profile update, and change password.
- 🏆 Tournament management with CRUD, search, filter, sorting, and pagination.
- 🎟️ Ticket booking for tournament seats and user ticket history.
- 💳 Payment integration with eSewa and Khalti verification flows.
- 📸 File uploads with Multer for tournament banners and user profile pictures.
- 🛡️ Role-based access control for Admin and User workflows.

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- Multer
- JSON Web Token

## Installation & Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

Create a `.env` file and configure the values below.

| Variable | Description |
| --- | --- |
| `PORT` | Server port number. |
| `NODE_ENV` | Runtime environment, for example `development` or `production`. |
| `MONGODB_URI` | MongoDB connection string. |
| `CORS_ORIGIN` | Allowed frontend origin for CORS. |
| `BASE_URL` | Base backend URL used in payment callbacks. |
| `FRONTEND_URL` | Frontend URL used in payment redirects. |
| `JWT_SECRET` | JWT secret used by auth middleware. |
| `JWT_ACCESS_SECRET` | Access token signing secret. |
| `JWT_REFRESH_SECRET` | Refresh token signing secret. |
| `JWT_ACCESS_EXPIRY` | Access token expiry, for example `15m`. |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry, for example `7d`. |
| `ESEWA_SECRET_KEY` | eSewa payment signing secret. |
| `ESEWA_WEBHOOK_SECRET` | eSewa webhook verification secret. |
| `KHALTI_SECRET_KEY` | Khalti API secret key. |
| `KHALTI_WEBHOOK_SECRET` | Khalti webhook verification secret. |
| `PAYMENT_WEBHOOK_SECRET` | Shared fallback secret for payment verification. |

## API Documentation

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/profile`
- `PATCH /api/v1/auth/change-password`

### Tournaments

- `GET /api/v1/tournament`
- `POST /api/v1/tournament`
- Supports search and filtering with query params such as `search`, `date`, `location`, `minPrize`, `maxPrize`, `page`, and `limit`.

### Tickets

- `POST /api/v1/ticket`
- `GET /api/v1/ticket/my-tickets`

### Payments

- `POST /api/v1/payment/initiate`
- `POST /api/v1/payment/verify`
- `GET /api/v1/payment/esewa/success`
- `GET /api/v1/payment/esewa/failure`
- `GET /api/v1/payment/khalti/success`
- `GET /api/v1/payment/khalti/failure`

### Uploads

- `POST /api/v1/upload/profile-picture`
- `POST /api/v1/upload/tournament-banner`

### Admin

- `POST /api/v1/admin/login`
- `POST /api/v1/admin/user`
- `GET /api/v1/admin/users`
- `DELETE /api/v1/admin/users/:id`
- `GET /api/v1/admin/tournaments`
- `DELETE /api/v1/admin/tournaments/:id`
- `GET /api/v1/admin/stats`

## Folder Structure

```text
src/
  app.ts
  config/
  features/
    auth/
    admin/
    payment/
    ticket/
    tournament/
    upload/
    user/
  middlewares/
  uploads/
  utils/
```

## Notes

- Uploaded files are served from `/uploads`.
- The API uses role-based protection for admin-only routes.
- Payment verification updates both payment and ticket status when successful.
