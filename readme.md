# 🚆 IRCTC Backend

A production-grade railway booking backend built with Node.js, Express, and PostgreSQL — featuring real-world concurrency handling with `SELECT FOR UPDATE` row-level locking to prevent double bookings.

> Built as a deep-dive into backend engineering: relational databases, JWT authentication, atomic transactions, and RESTful API design.

---

## ⚙️ Tech Stack

- **Runtime** — Node.js
- **Framework** — Express.js
- **Database** — PostgreSQL (Neon)
- **ORM** — Prisma v6
- **Authentication** — JWT (Access + Refresh Token)
- **Password Hashing** — bcrypt
- **Queue** — BullMQ
- **Cache / Session** — Redis
- **Rate Limiting** — express-rate-limit
- **Environment** — dotenv

---

## 🧠 Key Engineering Concepts

- **Row-level locking** with `SELECT FOR UPDATE` inside Prisma transactions to prevent race conditions during concurrent seat bookings
- **Atomic transactions** — booking creation and payment updates are wrapped in `prisma.$transaction` to ensure data consistency
- **Relational data modeling** — 11 interconnected tables with proper foreign keys and constraints
- **JWT Auth** — stateless authentication with access + refresh token flow
- **Auto seat generation** — seats are automatically created when a coach is added, via a utility wrapped in a Prisma transaction
- **PNR system** — every booking gets a unique PNR for tracking independent of internal IDs
- **Seat locking with TTL** — seats are temporarily held via `SeatLock` with an expiry time; a cron job cleans up expired holds automatically
- **Waiting list** — passengers on the waiting list are automatically promoted when a confirmed seat is cancelled, handled via a BullMQ queue and worker
- **Booking confirmation mail** — confirmation emails are sent asynchronously via a dedicated BullMQ queue, worker, and Nodemailer service
- **Partial cancellation** — passengers can cancel individual seats from a multi-seat booking
- **Rate limiting** — three separate limiters protect auth, search, and booking routes from abuse

---

## 🗃️ Database Schema

```
User ──────────────────► Booking ◄──── Schedule ◄──── Train
                            │               │              │
                            ▼               ▼              ▼
                         Payment         Platform       Coach
                            │               │              │
                            ▼               ▼              ▼
                       PassengerInfo     Station          Seat
                            │                              │
                            └──────────► SeatLock ◄────────┘
```

### Models

| Model | Description |
|-------|-------------|
| `User` | Passengers with username, email, mobile number, role (`USER`/`ADMIN`), and refresh token |
| `Train` | Train with number, name, source and destination station |
| `Station` | Physical station with a unique station code |
| `Platform` | Platform within a station — linked to departure and arrival schedules |
| `Coach` | Coach under a train with type, coach number, and price per seat |
| `Seat` | Individual seat with seat number and seat name — auto-generated on coach creation |
| `Schedule` | A train run on a specific date with source/destination platform, arrival and departure time |
| `SeatLock` | Temporary seat hold per user per schedule — tracks `HELD`/`BOOKED`/`CANCELLED` status with a `heldUntil` expiry |
| `Booking` | Full booking record with PNR, coach type, and status (`HELD`/`CONFIRMED`/`CANCELLED`/`WAITING`/`WAITING_HELD`/`PARTIAL_CONFIRMED`) |
| `PassengerInfo` | Individual passenger details (name, age, gender, status) — linked to a booking and optionally to a seat lock |
| `Payment` | Payment record linked to a booking with amount and status |

---

## 🔐 Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL=
CORS_ORIGIN=
PORT=
DOTENV_CONFIG_QUIET

ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=

REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=

ADMIN_SECRET =
RAZOR_PAY_API_KEY =
RAZOR_PAY_API_SECRET =
REDIS_USERNAME =
REDIS_PASSWORD =
REDIS_HOST =
SMTP_USER_ID =
SMTP_PASS =
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

### 🚉 Train & Seat Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/search-train?from=&to=&date=` | ❌ | Search trains by route and date |
| `GET` | `/get-train-by-id?trainId=` | ❌ | Get train details by ID or train number |
| `GET` | `/available-seats/:scheduleId?coachType=` | ❌ | Get available seats for a schedule |

---

### 🎫 Booking Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/book-seat/:scheduleId/:coachType` | ✅ | Book seats with row-level locking |
| `GET` | `/bookings/get-booking?pnr=` | ✅ | Get booking by PNR number |
| `GET` | `/bookings/:bookingId/get-booking` | ✅ | Get booking by ID |
| `PATCH` | `/bookings/:bookingId/cancel-booking` | ✅ | Cancel a full booking |
| `PATCH` | `/bookings/:bookingId/partial-cancel` | ✅ | Cancel specific seats from a booking |

> ⚡ Booking uses `SELECT FOR UPDATE` inside a Prisma transaction — safe for concurrent requests.

---

### 💳 Payment Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/bookings/:bookingId/payment` | ✅ | Initiate payment for a booking |
| `PATCH` | `/bookings/:paymentId/update-payment` | ✅ | Confirm or update payment status |

> Amount is automatically calculated from the coach price — no manual input needed.

> Confirming payment automatically marks the booking as `CONFIRMED` — wrapped in a transaction.

---

### 🛠️ Admin Routes

Base URL: `/api/admin`

> Protected with JWT + Admin role middleware.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register-admin` | Register an admin account |
| `GET` | `/login` | Admin login |
| `POST` | `/station` | Create a station |
| `POST` | `/stations/:stationId/platforms` | Add a platform to a station |
| `POST` | `/train` | Create a train |
| `POST` | `/trains/:trainNumber/coaches` | Add a coach (auto-generates all seats) |
| `POST` | `/schedule` | Create a schedule for a train |

---

## 🔄 Complete Booking Flow

```
1. POST   /register-user                    → create account
2. POST   /login                            → get access token
3. GET    /search-train                     → find trains on your route
4. GET    /available-seats/:scheduleId      → check seat availability
5. POST   /book-seat/:scheduleId/:coachType → seats locked via SeatLock (HELD for 10 mins)
6. POST   /bookings/:id/payment             → initiate payment
7. PATCH  /bookings/:id/update-payment      → confirm payment → booking CONFIRMED
8. GET    /bookings/get-booking?pnr=        → track booking via PNR
```

---

## 🔒 Concurrency & Race Condition Handling

The core challenge in any booking system is preventing two users from booking the same seat simultaneously.

This is handled using `prisma.$transaction` with a raw `SELECT FOR UPDATE` query — rows are locked at the database level for the duration of the transaction, so concurrent requests queue up instead of creating duplicate bookings.

---

## ⏱️ Seat Lock & Cron Cleanup

When a user initiates a booking, seats are temporarily held via `SeatLock` with a `heldUntil` timestamp (10 minutes). If payment is not completed within this window, a cron job (`seatCleanJob`) automatically releases the held seats and frees them for other users.

---

## 📬 Async Services (BullMQ)

Two background queues run independently of the main request cycle:

- **Booking Confirmation Mail** — triggers a Nodemailer email to the passenger once payment is confirmed
- **Waiting List Promotion** — when a confirmed booking is cancelled, the next passenger on the waiting list is automatically promoted and notified

---

## 📁 Folder Structure

```
irctc-backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── env.config.js
│   │   ├── nodemailer.config.js
│   │   └── redis.config.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── coach.controller.js
│   │   ├── payment.controller.js
│   │   ├── platform.controller.js
│   │   ├── schedule.controller.js
│   │   ├── seat.controller.js
│   │   ├── station.controller.js
│   │   └── train.controller.js
│   ├── cron/
│   │   └── seatCleanJob.js
│   ├── db/
│   ├── generated/
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   └── rateLimiter.js
│   ├── queues/
│   │   ├── bookingConfirmationMail.queue.js
│   │   └── waitingList.queue.js
│   ├── routes/
│   │   ├── admin.route.js
│   │   └── user.route.js
│   ├── services/
│   │   ├── bookingConfirmationMail.service.js
│   │   └── waitingTicketBooking.service.js
│   ├── utils/
│   │   ├── apiError.js
│   │   ├── apiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── generatePnr.js
│   │   ├── generateSeats.js
│   │   ├── getTenMinutesTime.js
│   │   ├── isValidPnr.js
│   │   ├── jwtGenerator.js
│   │   ├── seatCleanupCron.js
│   │   └── sendBookingConfirmationMail.js
│   ├── validators/
│   ├── worker/
│   │   ├── bookingConfirmationMail.worker.js
│   │   └── waitingList.worker.js
│   ├── app.js
│   └── constants.js
├── .env.example
├── package.json
├── prisma.config.ts
└── server.js
```

---

## 👤 Author

**Shahnawaz Hussain**
GitHub: [@shahnawaz-hussaink](https://github.com/shahnawaz-hussaink)

---

> ⭐ If you found this project useful or learned something from it, consider giving it a star.