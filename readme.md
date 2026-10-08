# 🚆 IRCTC Railway Booking & Reservation Engine

[![Node.js](https://img.shields.io/badge/Node.js-v18+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM_v6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-ioredis-dc382d?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Message_Queue-orange?style=for-the-badge&logo=bull&logoColor=white)](https://docs.bullmq.io/)
[![JWT](https://img.shields.io/badge/JWT-Access_%2B_Refresh-black?style=for-the-badge&logo=json-web-tokens&logoColor=white)](https://jwt.io/)

A high-concurrency, production-grade railway reservation system backend built with **Node.js**, **Express**, **PostgreSQL**, **Prisma**, **Redis**, and **BullMQ**. Engineered to solve core distributed booking challenges, including database race conditions via **Row-Level Locking (`SELECT FOR UPDATE`)**, automated **10-minute TTL seat reservation locks**, **asynchronous BullMQ workers for waitlist promotion & email dispatch**, and **Redis-backed distributed rate limiting**.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Key Engineering Highlights](#-key-engineering-highlights)
  - [1. Concurrency Control & Row-Level Locking](#1-concurrency-control--row-level-locking)
  - [2. Temporary Seat Holds & TTL Expiry Cron](#2-temporary-seat-holds--ttl-expiry-cron)
  - [3. Dynamic Waiting List & Automated Promotion](#3-dynamic-waiting-list--automated-promotion)
  - [4. Asynchronous Email Notification Queue](#4-asynchronous-email-notification-queue)
  - [5. Granular Multi-Tier Rate Limiting](#5-granular-multi-tier-rate-limiting)
  - [6. Automated Coach & Seat Layout Generator](#6-automated-coach--seat-layout-generator)
- [Database Schema & ERD](#-database-schema--erd)
- [End-to-End Booking Lifecycle](#-end-to-end-booking-lifecycle)
- [API Reference](#-api-reference)
  - [Authentication Routes](#-authentication-routes-user--admin)
  - [Train & Seat Availability Routes](#-train--seat-availability-routes)
  - [Booking & Reservation Routes](#-booking--reservation-routes)
  - [Payment Simulation Routes](#-payment-simulation-routes)
  - [Admin Infrastructure Management Routes](#-admin-infrastructure-management-routes)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [Project Directory Structure](#-project-directory-structure)
- [Author & License](#-author--license)

---

## 🏗️ Architecture Overview

```mermaid
flowchart TB
    Client([Client / Frontend / Postman])
    
    subgraph Gateway ["Express Application Layer & Middlewares"]
        CORS["CORS & Cookie Parser"]
        RateLimiter["Redis-Backed Distributed Rate Limiters<br/>(Global, Auth, Search, Booking)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
    end

    subgraph CoreServices ["Application Controllers & Services"]
        AuthController["Auth Controller"]
        TrainController["Train & Schedule Search"]
        BookingController["Booking Controller<br/>(Atomic Transactions & Row Locking)"]
        PaymentController["Payment Controller<br/>(Auto PNR & Status Updates)"]
        AdminController["Admin Operations<br/>(Station, Platform, Train, Coach, Schedule)"]
    end

    subgraph DatabaseLayer ["Data & Storage Layer"]
        PostgreSQL[("PostgreSQL (Neon)<br/>11 Relational Tables")]
        RedisDB[("Redis Instance<br/>Rate Limiting & BullMQ State")]
    end

    subgraph AsyncWorkers ["Background Queues & Workers (BullMQ / Node-Cron)"]
        SeatCron["Cron Job: seatCleanJob<br/>(Every 5 mins cleans expired holds)"]
        MailWorker["Worker: bookingConfirmationMail<br/>(Nodemailer HTML Ticket Delivery)"]
        WaitlistWorker["Worker: waitingListWorker<br/>(FIFO Waitlist Upgrades on Cancellation)"]
    end

    Client --> CORS --> RateLimiter --> AuthMiddleware
    AuthMiddleware --> AuthController
    AuthMiddleware --> TrainController
    AuthMiddleware --> BookingController
    AuthMiddleware --> PaymentController
    AuthMiddleware --> AdminController

    AuthController & TrainController & BookingController & PaymentController & AdminController --> PostgreSQL
    RateLimiter --> RedisDB
    BookingController -.->|Push Job| AsyncWorkers
    PaymentController -.->|Push Job| AsyncWorkers
    SeatCron -->|Clean Expired Locks| PostgreSQL
    WaitlistWorker -->|Reassign Seats| PostgreSQL
```

---

## 🧠 Key Engineering Highlights

### 1. Concurrency Control & Row-Level Locking
Preventing double-booking of identical berths across simultaneous concurrent requests is achieved by wrapping seat discovery and reservation within **`prisma.$transaction`** combined with PostgreSQL raw row-level locks:
```sql
SELECT * FROM "Seat" WHERE id = ANY($1::int[]) FOR UPDATE;
```
By acquiring an exclusive write lock on matching `Seat` records for the transaction duration, concurrent booking requests for overlapping seats are queued in FIFO order at the database engine level, eliminating race conditions.

### 2. Temporary Seat Holds & TTL Expiry Cron
When a passenger reserves a seat, it transitions to a `HELD` state in the `SeatLock` table with a `heldUntil` timestamp set to **10 minutes in the future**.
- If payment completes within 10 minutes, status upgrades to `BOOKED` (`CONFIRMED`).
- If payment is abandoned, a recurring **`node-cron`** job (`*/5 * * * *`) sweeps expired locks, removing stale holds and freeing seats back to the general inventory.

### 3. Dynamic Waiting List & Automated Promotion
- When confirmed berths are exhausted or earlier waitlisted bookings exist, new bookings are classified as `WAITING` / `WAITING_HELD`.
- When any passenger cancels a confirmed ticket (full or partial cancellation), a message is dispatched to the BullMQ **`waitingListQueue`**.
- The **`waitingListWorker`** performs a single-concurrency FIFO scan of waitlisted passengers, fetches available seats in that coach category, and atomically reallocates the seat, upgrading passenger status to `CONFIRMED` and booking status to `PARTIAL_CONFIRMED` / `CONFIRMED`.

### 4. Asynchronous Email Notification Queue
- Decoupled from the HTTP request/response cycle to guarantee fast API response times.
- Once a booking is initiated, a BullMQ job is dispatched to **`bookingConfirmationMailQueue`**.
- The worker compiles a structured HTML email ticket containing PNR, Train Name, Platform, Departure/Arrival times, and individual passenger berth allocations, dispatched via **Nodemailer SMTP**.

### 5. Granular Multi-Tier Rate Limiting
Backed by Redis memory stores (`rate-limit-redis`) to prevent brute-force attacks and bot-driven seat hoarding:
- **Global Rate Limiter**: `100 req/min` per IP.
- **Auth Rate Limiter**: `10 req/min` on `/register-user`, `/login`.
- **Search Rate Limiter**: `5 req/min` on train search and availability checks.
- **Booking Rate Limiter**: `5 req/min` keyed dynamically by `userId` and IP address.

### 6. Automated Coach & Seat Layout Generator
Adding a coach automatically parses the coach classification and provisions the exact railway berth layout:
- **`SLEEPER` & `3AC`**: 8-berth cycle (Lower, Middle, Upper, Lower, Middle, Upper, Side Lower, Side Upper).
- **`2AC`**: 6-berth cycle (Lower, Upper, Lower, Upper, Side Lower, Side Upper).
- **`1AC`**: 4-berth cycle (Lower, Upper, Lower, Upper).

---

## 🗃️ Database Schema & ERD

```mermaid
erDiagram
    User ||--o{ Booking : "places"
    User ||--o{ SeatLock : "holds"
    Train ||--o{ Coach : "has"
    Train ||--o{ Schedule : "runs"
    Station ||--o{ Platform : "contains"
    Platform ||--o{ Schedule : "source platform"
    Platform ||--o{ Schedule : "destination platform"
    Coach ||--o{ Seat : "contains"
    Schedule ||--o{ Booking : "scheduled for"
    Schedule ||--o{ SeatLock : "locks for"
    Booking ||--o{ Payment : "generates"
    Booking ||--o{ SeatLock : "includes"
    Booking ||--o{ PassengerInfo : "contains"
    Seat ||--o{ SeatLock : "locked by"
    SeatLock ||--o| PassengerInfo : "assigned to"

    User {
        int id PK
        string username UK
        string email UK
        string mobileNumber UK
        string password
        enum role "USER | ADMIN"
        string refreshToken
        datetime createdAt
    }

    Train {
        int id PK
        int trainNumber UK
        string trainName
        string sourceStation
        string destinationStation
    }

    Station {
        int id PK
        string stationName
        string stationCode UK
    }

    Platform {
        int id PK
        int platformNumber
        int stationId FK
    }

    Coach {
        int id PK
        string coachNumber
        string coachType
        int price
        int trainId FK
    }

    Seat {
        int id PK
        int seatNumber
        string seatName
        int coachId FK
    }

    Schedule {
        int id PK
        int trainId FK
        int sourcePlatformId FK
        int destinationPlatformId FK
        datetime arrivalTime
        datetime departureTime
        datetime date
    }

    Booking {
        int id PK
        int userId FK
        int scheduleId FK
        string pnr UK
        string coachType
        enum status "HELD | WAITING_HELD | CONFIRMED | WAITING | CANCELLED | PARTIAL_CONFIRMED"
        datetime createdAt
    }

    SeatLock {
        int id PK
        int seatId FK
        int scheduleId FK
        int userId FK
        int bookingId FK
        enum status "HELD | BOOKED | CANCELLED"
        datetime heldUntil
    }

    PassengerInfo {
        int id PK
        string passengerName
        int passengerAge
        enum passengerGender "MALE | FEMALE | TRANSGENDER"
        enum passengerStatus "CONFIRMED | WAITING | CANCELLED"
        int bookingId FK
        int seatLockId FK
        datetime createdAt
    }

    Payment {
        int id PK
        int bookingId FK
        string status "Pending | SUCCESS | REFUND_PENDING"
        int amount
        datetime createdAt
    }
```

---

## 🔄 End-to-End Booking Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Passenger as User / Passenger
    participant API as IRCTC Express API
    participant PG as PostgreSQL (Prisma)
    participant Redis as Redis Queue (BullMQ)
    participant Worker as Background Workers
    participant Email as Nodemailer SMTP

    Passenger->>API: POST /api/v1/user/register-user & /login
    API-->>Passenger: Sets JWT accessToken & refreshToken Cookies

    Passenger->>API: GET /api/v1/user/search-train?from=NDLS&to=BCT&date=2026-10-15
    API->>PG: Query Schedules & Stations
    PG-->>API: Schedules List
    API-->>Passenger: Train schedules found

    Passenger->>API: GET /api/v1/user/available-seats/:scheduleId?coachType=3AC
    API->>PG: Count Total Seats - Active SeatLocks
    PG-->>API: Available Seat Count
    API-->>Passenger: Available Seats: N

    Passenger->>API: POST /api/v1/user/book-seat/:scheduleId/3AC (Passenger Details)
    Note over API,PG: BEGIN $transaction with SELECT FOR UPDATE
    API->>PG: Lock matching seat rows & create SeatLock (Status: HELD, TTL: 10m)
    API->>PG: Create Booking (Status: HELD) & PassengerInfo
    Note over API,PG: COMMIT $transaction
    API->>Redis: Enqueue bookingConfirmationMailQueue job
    API-->>Passenger: Booking Initiated (Status: HELD)

    Passenger->>API: POST /api/v1/user/bookings/:bookingId/payment
    API->>PG: Calculate Amount (Seats × Coach Price) & Create Payment Record
    API-->>Passenger: Payment Created (Status: Pending)

    Passenger->>API: PATCH /api/v1/user/bookings/:paymentId/update-payment { status: "SUCCESS" }
    Note over API,PG: BEGIN $transaction
    API->>PG: Update Payment -> SUCCESS
    API->>PG: Update Booking -> CONFIRMED, Generate Unique 10-digit PNR
    API->>PG: Update SeatLock -> BOOKED
    Note over API,PG: COMMIT $transaction
    API-->>Passenger: Payment Updated & Booking Confirmed with PNR

    Worker->>Redis: Poll bookingConfirmationMailQueue
    Worker->>PG: Fetch complete Booking & Passenger metadata
    Worker->>Email: Send formatted HTML Ticket to User
```

---

## 📡 API Reference

### Base URLs
- **User Services**: `/api/v1/user`
- **Admin Services**: `/api/v1/admin`

---

### 🔑 Authentication Routes (User & Admin)

#### 1. Register User
- **Endpoint**: `POST /api/v1/user/register-user`
- **Rate Limit**: `10 req/min`
- **Body**:
  ```json
  {
    "username": "johndoe",
    "email": "johndoe@example.com",
    "mobileNumber": "9876543210",
    "password": "SecurePassword123"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "statusCode": 201,
    "data": {
      "id": 1,
      "username": "johndoe",
      "email": "johndoe@example.com",
      "mobileNumber": "9876543210",
      "createdAt": "2026-10-08T06:00:00.000Z"
    },
    "message": "User registered successfully",
    "success": true
  }
  ```

#### 2. Login User
- **Endpoint**: `POST /api/v1/user/login`
- **Rate Limit**: `10 req/min`
- **Body**:
  ```json
  {
    "email": "johndoe@example.com",
    "mobileNumber": "9876543210",
    "password": "SecurePassword123"
  }
  ```
- **Response** (`200 OK`): Sets HTTP-only cookies `accessToken` and `refreshToken`.

#### 3. Logout User
- **Endpoint**: `POST /api/v1/user/logout`
- **Auth**: Required (`accessToken` in Cookie or `Authorization: Bearer <token>`)
- **Response** (`200 OK`): Clears authentication cookies.

#### 4. Register Admin
- **Endpoint**: `POST /api/v1/admin/register-admin`
- **Body**:
  ```json
  {
    "username": "admin_user",
    "email": "admin@irctc.com",
    "mobileNumber": "9998887776",
    "password": "AdminSecurePassword123",
    "admin_secret": "your_secure_admin_registration_secret_key"
  }
  ```

---

### 🚉 Train & Seat Availability Routes

#### 1. Search Trains by Route & Date
- **Endpoint**: `GET /api/v1/user/search-train?from=NDLS&to=BCT&date=2026-10-15`
- **Rate Limit**: `5 req/min`
- **Response** (`200 OK`): Returns train details, departure/arrival times, source and destination platforms.

#### 2. Get Train by ID or Name
- **Endpoint**: `GET /api/v1/user/get-train-by-id`
- **Rate Limit**: `5 req/min`
- **Body / Params**:
  ```json
  {
    "trainNumber": 12951,
    "trainName": "MUMBAI RAJDHANI"
  }
  ```

#### 3. Check Available Seats
- **Endpoint**: `GET /api/v1/user/available-seats/:scheduleId?coachType=3AC`
- **Rate Limit**: `5 req/min`
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "data": {
      "availableSeat": 64
    },
    "message": "Got all available Seats",
    "success": true
  }
  ```

---

### 🎫 Booking & Reservation Routes

#### 1. Book Seats (Concurrency Protected)
- **Endpoint**: `POST /api/v1/user/book-seat/:scheduleId/:coachType`
- **Auth**: Required
- **Rate Limit**: `5 req/min` per user/IP
- **Body**: Up to 5 passengers per request:
  ```json
  {
    "passenger1": {
      "passengerName": "Alice Smith",
      "passengerAge": 28,
      "passengerGender": "FEMALE"
    },
    "passenger2": {
      "passengerName": "Bob Smith",
      "passengerAge": 32,
      "passengerGender": "MALE"
    }
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "data": {
      "id": 14,
      "userId": 1,
      "scheduleId": 3,
      "status": "HELD",
      "coachType": "3AC",
      "createdAt": "2026-10-08T06:30:00.000Z"
    },
    "message": "Seat Booked",
    "success": true
  }
  ```

#### 2. Get Booking by ID
- **Endpoint**: `GET /api/v1/user/bookings/:bookingId/get-booking`
- **Auth**: Required

#### 3. Get Booking by PNR
- **Endpoint**: `GET /api/v1/user/bookings/get-booking`
- **Auth**: Required
- **Body**:
  ```json
  {
    "pnr": "4829105672"
  }
  ```

#### 4. Cancel Entire Booking
- **Endpoint**: `PATCH /api/v1/user/bookings/:bookingId/cancel-booking`
- **Auth**: Required
- **Action**: Marks booking as `CANCELLED`, deletes seat locks, updates payment to `REFUND_PENDING`, and publishes a promotion event to BullMQ `waitingListQueue`.

#### 5. Partial Cancellation (Individual Passengers)
- **Endpoint**: `PATCH /api/v1/user/bookings/:bookingId/partial-cancel`
- **Auth**: Required
- **Body**:
  ```json
  {
    "passengerIds": [102, 103]
  }
  ```
- **Action**: Cancels selected passengers, frees their seats, recalculates booking status (`PARTIAL_CONFIRMED` or `CANCELLED`), and triggers waitlist promotion.

---

### 💳 Payment Simulation Routes

#### 1. Initiate Payment
- **Endpoint**: `POST /api/v1/user/bookings/:bookingId/payment`
- **Auth**: Required
- **Action**: Auto-calculates total fare from `passengerCount * coachPrice`.
- **Response** (`201 Created`): Returns `paymentId`, `bookingId`, `amount`, and `Status: "Pending"`.

#### 2. Confirm Payment Status
- **Endpoint**: `PATCH /api/v1/user/bookings/:paymentId/update-payment`
- **Auth**: Required
- **Body**:
  ```json
  {
    "status": "SUCCESS"
  }
  ```
- **Action**: Atomically transitions Payment to `SUCCESS`, Booking to `CONFIRMED` (or `WAITING`), creates a unique 10-digit PNR, and changes SeatLocks to `BOOKED`.

---

### 🛠️ Admin Infrastructure Management Routes

> All admin operations require authentication with a user possessing `role === "ADMIN"`.

| Method | Endpoint | Description | Sample Payload |
|---|---|---|---|
| `POST` | `/api/v1/admin/station` | Create railway station | `{"stationName": "NEW DELHI", "stationCode": "NDLS"}` |
| `POST` | `/api/v1/admin/stations/:stationId/platforms` | Add platform to station | `{"platformNumber": 1}` |
| `POST` | `/api/v1/admin/train` | Register a new train | `{"trainName": "RAJDHANI EXP", "trainNumber": 12951, "sourceStation": "NEW DELHI", "destinationStation": "MUMBAI CENTRAL"}` |
| `POST` | `/api/v1/admin/trains/:trainNumber/coaches` | Add coach with auto seats | `{"coachNumber": "B1", "coachType": "3AC", "price": 1850}` |
| `POST` | `/api/v1/admin/schedule` | Schedule train departure | `{"trainId": 1, "sourcePlatformId": 1, "destinationPlatformId": 2, "arrivalTime": "2026-10-15T08:00:00Z", "departureTime": "2026-10-15T16:30:00Z", "date": "2026-10-15"}` |

---

## 🔐 Environment Variables

Create a `.env` file in the root directory or copy `.env.example`:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP Server port | `8000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `CORS_ORIGIN` | Allowed CORS Origins | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL Connection URI | `postgresql://user:pass@ep-xyz.neon.tech/irctc?sslmode=require` |
| `ACCESS_TOKEN_SECRET` | Secret key for JWT Access Tokens | `your_access_token_secret_32_chars` |
| `ACCESS_TOKEN_EXPIRY` | Access token lifespan | `1d` |
| `REFRESH_TOKEN_SECRET` | Secret key for JWT Refresh Tokens | `your_refresh_token_secret_32_chars` |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifespan | `10d` |
| `ADMIN_SECRET` | Secret key required to register admin accounts | `super_secret_admin_passkey` |
| `REDIS_HOST` | Redis Server Host | `127.0.0.1` |
| `REDIS_PORT` | Redis Server Port | `6379` |
| `REDIS_PASSWORD` | Redis Server Password (optional) | `your_redis_password` |
| `SMTP_USER_ID` | SMTP Email Address (Nodemailer) | `your_account@gmail.com` |
| `SMTP_PASS` | SMTP App Password | `xxxx xxxx xxxx xxxx` |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18.x
- **PostgreSQL** database (Local or [Neon](https://neon.tech/))
- **Redis** server running (Local or [Upstash](https://upstash.com/))
- **SMTP credentials** (e.g. Gmail App Password)

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shahnawaz-hussaink/irctc-backend.git
   cd irctc-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Open .env and fill in your PostgreSQL, Redis, and SMTP values
   ```

4. **Run database migrations & generate Prisma client**:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start development server** (with nodemon and active workers):
   ```bash
   npm run dev
   ```
   *The server starts listening on `http://localhost:8000`, initializes BullMQ workers, and starts the 5-minute seat cleanup cron job.*

---

## 📁 Project Directory Structure

```
irctc-backend/
├── prisma/
│   ├── migrations/               # PostgreSQL schema migration history
│   └── schema.prisma             # Prisma 11-model relational schema
├── src/
│   ├── config/
│   │   ├── env.config.js         # Centralized dotenv loader
│   │   ├── nodemailer.config.js  # Nodemailer transporter configuration
│   │   └── redis.config.js       # IORedis connection configuration
│   ├── controllers/
│   │   ├── auth.controller.js    # User & admin registration, login, logout
│   │   ├── booking.controller.js # Concurrency locking, booking, cancellations
│   │   ├── coach.controller.js   # Coach creation & auto seat provisioning
│   │   ├── payment.controller.js # Payment initiation, verification, PNR generation
│   │   ├── platform.controller.js# Station platform creation
│   │   ├── schedule.controller.js# Train journey scheduling
│   │   ├── seat.controller.js    # Seat availability checking
│   │   ├── station.controller.js # Station entity management
│   │   └── train.controller.js   # Train registration and search
│   ├── cron/
│   │   └── seatCleanJob.js       # Node-cron trigger for TTL hold releases
│   ├── db/
│   │   └── prisma.js             # Singleton Prisma client instance
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT verification & Admin RBAC
│   │   ├── errorHandler.middleware.js # Standardized error response formatter
│   │   └── rateLimiter.js        # Redis-backed multi-tier rate limiters
│   ├── queues/
│   │   ├── bookingConfirmationMail.queue.js # BullMQ confirmation email queue
│   │   └── waitingList.queue.js  # BullMQ waitlist promotion queue
│   ├── routes/
│   │   ├── admin.route.js        # Admin routes (/api/v1/admin)
│   │   └── user.route.js         # Passenger routes (/api/v1/user)
│   ├── services/
│   │   ├── bookingConfirmationMail.service.js # Email queue dispatcher
│   │   └── waitingTicketBooking.service.js   # Waiting ticket allocation logic
│   ├── utils/
│   │   ├── apiError.js           # Custom API Error class
│   │   ├── apiResponse.js        # Uniform API response wrapper
│   │   ├── asyncHandler.js       # Express async route wrapper
│   │   ├── generatePnr.js        # Unique 10-digit PNR generator
│   │   ├── generateSeats.js      # Layout-aware seat builder (1AC, 2AC, 3AC, Sleeper)
│   │   ├── getTenMinutesTime.js  # 10-minute timestamp calculator
│   │   ├── isValidPnr.js         # PNR format validator
│   │   ├── jwtGenerator.js       # Access & refresh token signing
│   │   ├── seatCleanupCron.js    # Database cleaner for expired seat holds
│   │   └── sendBookingConfirmationMail.js # SMTP mail transport execution
│   ├── worker/
│   │   ├── bookingConfirmationMail.worker.js # BullMQ worker for ticket emails
│   │   └── waitingList.worker.js # BullMQ worker for waitlist upgrades
│   ├── app.js                    # Express app initialization & middleware stack
│   └── constants.js              # Business constants (seat counts, coach sizes)
├── .env.example                  # Template environment variables
├── package.json                  # Dependencies & scripts
├── prisma.config.ts              # Prisma CLI configuration
├── readme.md                     # Documentation
└── server.js                     # Server entrypoint (App + BullMQ Workers)
```

---

## 👤 Author

**Shahnawaz Hussain**  
- GitHub: [@shahnawaz-hussaink](https://github.com/shahnawaz-hussaink)

---

⭐ *If you find this project useful or educational, feel free to give it a star on GitHub!*