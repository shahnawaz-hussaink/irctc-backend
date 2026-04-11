# 🚆 IRCTC Backend

A production-grade railway booking backend built with Node.js, Express, and PostgreSQL — featuring real-world concurrency handling with `SELECT FOR UPDATE` row-level locking to prevent double bookings.

> Built as a deep-dive into backend engineering: relational databases, JWT authentication, atomic transactions, and RESTful API design.

---

## ⚙️ Tech Stack

- **Runtime** — Node.js
- **Framework** — Express.js
- **Database** — PostgreSQL (Neon)
- **ORM** — Prisma
- **Authentication** — JWT (Access + Refresh Token)
- **Password Hashing** — bcrypt
- **Environment** — dotenv

---

## 🧠 Key Engineering Concepts

- **Row-level locking** with `SELECT FOR UPDATE` inside Prisma transactions to prevent race conditions during concurrent seat bookings
- **Atomic transactions** — booking creation and payment updates are wrapped in `prisma.$transaction` to ensure data consistency
- **Relational data modeling** — 9 interconnected tables with proper foreign keys and constraints
- **JWT Auth** — stateless authentication with access + refresh token flow

---

## 🗃️ Database Schema

```
User ──────────────────► Booking ◄──── Schedule ◄──── Train
                            │               │              │
                            ▼               ▼              ▼
                         Payment         Platform       Coach
                                            │              │
                                            ▼              ▼
                                         Station         Seat
```

### Models

| Model | Description |
|-------|-------------|
| `User` | Passengers who register and book tickets |
| `Train` | Train details with source and destination |
| `Station` | Physical stations with unique codes |
| `Platform` | Platforms within a station |
| `Coach` | Coaches belonging to a train with type and price |
| `Seat` | Individual seats within a coach |
| `Schedule` | A train running on a specific date from/to platforms |
| `Booking` | A seat booked by a user for a schedule |
| `Payment` | Payment record linked to a booking |

---

## 🔐 Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL=
CORS_ORIGIN=
PORT=

ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=

REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=
```

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/shahnawaz-hussaink/irctc-backend.git
cd irctc-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your values

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

---

## 📡 API Reference

Base URL: `/api/v1`

---

### 🔑 Auth Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register-user` | ❌ | Register a new user |
| `POST` | `/login` | ❌ | Login and get tokens |
| `POST` | `/logout` | ✅ | Logout current user |



---

### 🚉 Station & Train Routes (User)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/search-train?from=&to=&date=` | ❌ | Search trains by route and date |
| `GET` | `/get-train-by-id?trainId=` | ❌ | Get train details by ID |
| `GET` | `/available-seats/:scheduleId?coachType=` | ✅ | Get available seat count for a schedule |



---

### 🎫 Booking Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/book-seat` | ✅ | Book a seat (with row-level locking) |
| `GET` | `/bookings/:bookingId/get-booking` | ✅ | Get a specific booking |
| `PATCH` | `/bookings/:bookingId/cancel-booking` | ✅ | Cancel a booking |



> ⚡ Uses `SELECT FOR UPDATE` inside a Prisma transaction — safe for concurrent requests.

---

### 💳 Payment Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/bookings/:bookingId/payment` | ✅ | Create payment for a booking |
| `PATCH` | `/bookings/:paymentId/update-payment` | ✅ | Update payment status |


> Amount is automatically fetched from the coach price — no manual input needed.


> Updating payment also automatically updates booking status — wrapped in a transaction.

---

### 🛠️ Admin Routes

> No auth middleware for now — admin routes are for seeding system data.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/station` | Create a station |
| `POST` | `/stations/:stationId/platforms` | Create a platform under a station |
| `POST` | `/train` | Create a train |
| `POST` | `/trains/:trainNumber/coaches` | Create a coach under a train |
| `POST` | `/schedule` | Create a schedule |



---

## 🔄 Complete Booking Flow

```
1. POST   /register-user         → create account
2. POST   /login                 → get access token
3. GET    /search-train          → find trains on your route
4. GET    /available-seats/:id   → check seat availability
5. GET    /book-seat             → system auto-assigns a seat
6. POST   /bookings/:id/payment  → initiate payment
7. PATCH  /bookings/:id/update-payment → confirm payment
```

---

## 🔒 Concurrency & Race Condition Handling

The core challenge in any booking system is preventing two users from booking the same seat simultaneously.



This is implemented using `prisma.$transaction` with raw `SELECT FOR UPDATE` query.

---

## 📁 Folder Structure

```
irctc-backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── env.config.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── coach.controller.js
│   │   ├── payment.controller.js
│   │   ├── platform.controller.js
│   │   ├── schedule.controller.js
│   │   ├── seat.controller.js
│   │   └── station.controller.js
│   ├── db/
│   │   └── prisma.js
│   ├── generated/
│   │   └── prisma/
│   ├── middlewares/
│   │   ├── errorHandler.middleware.js
│   │   └── verifyJWT.middleware.js
│   ├── routes/
│   │   ├── admin.route.js
│   │   └── user.route.js
│   ├── utils/
│   │   ├── apiError.js
│   │   ├── apiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── generateSeats.js
│   │   └── jwtGenerator.js
│   └── validators/
│       ├── app.js
│       └── constants.js
├── .env
├── .env.example
├── .gitignore
├── .prettierrc
├── .prettierignore
├── package.json
├── prisma.config.ts
├── readme.md
└── server.js
```

---

## 👤 Author

**Shahnawaz Hussain**
GitHub: [@shahnawaz-hussaink](https://github.com/shahnawaz-hussaink)

---

> ⭐ If you found this project useful or learned something from it, consider giving it a star.