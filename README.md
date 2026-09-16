# Janani Swasthya

Janani Swasthya is a complete maternal and child health management web application based on the supplied Tribhuvan University project proposal. It supports mother and child registration, ANC records, growth monitoring data, vaccination schedules, reminders, assistance requests, dashboards, reports, and role-based access.

## One-click setup and run

The package includes an operating-system launcher. Each launcher checks Docker first, installs it when the platform supports automatic installation, starts Docker, builds the application, waits for the health check, and opens the website.

### Windows 10 or 11

Double-click `RUN-WINDOWS.cmd`. If Docker is missing, the script installs Docker Desktop through WinGet. Docker Desktop may require you to accept its licence, enable WSL 2 or virtualisation, or restart Windows once. Run the same file again after a required restart.

### Linux

Open a terminal in this folder and run:

```bash
chmod +x RUN-LINUX.sh
./RUN-LINUX.sh
```

The script supports apt-based distributions such as Debian, Ubuntu, Kali and Parrot, plus dnf and pacman systems. It automatically uses `sudo` when the current account cannot access the Docker socket.

### macOS

Double-click `RUN-MACOS.command`, or run:

```bash
chmod +x RUN-MACOS.command
./RUN-MACOS.command
```

If Docker is missing, the script installs Docker Desktop with Homebrew when available, otherwise it downloads the correct official installer for Apple silicon or Intel Macs. Complete the Docker licence prompt on first launch.

## Manual Docker start

Requirements: Docker Desktop or Docker Engine with Docker Compose.

```bash
docker compose up --build
```

Open **http://localhost:4000**. The first start creates the PostgreSQL schema and inserts safe demonstration data automatically.

If a previously built Alpine-based application image reports a Prisma/OpenSSL schema-engine error, rebuild the current image without cache:

```bash
docker-compose down
docker-compose build --no-cache app
docker-compose up
```

Stop the application:

```bash
docker compose down
```

To also delete the demonstration database:

```bash
docker compose down -v
```

## Demo accounts

All demonstration accounts use the password `Admin@123`.

| Role | Email | Access |
| --- | --- | --- |
| Healthcare worker | `worker@janani.gov.np` | Register and update care records |
| Health post supervisor | `supervisor@janani.gov.np` | Read dashboards, queues, and reports |
| System administrator | `admin@janani.gov.np` | Full access and user management |

Change these credentials and `JWT_SECRET` before using the system outside a local demonstration.

## Run manually for development

Requirements: Node.js 20+ and PostgreSQL 15+.

1. Create a PostgreSQL database named `janani_swasthya`.
2. Copy `.env.example` to `server/.env` and update `DATABASE_URL` and `JWT_SECRET`.
3. Install dependencies:

   ```bash
   npm run install:all
   ```

4. Create the database schema and demonstration records:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. In terminal 1, run the API:

   ```bash
   npm run dev:server
   ```

6. In terminal 2, run the React app:

   ```bash
   npm run dev:web
   ```

7. Open **http://localhost:5173**.

## Production build without Docker

```bash
npm run build
npm start
```

The Express server serves the compiled React application from `web/dist` on the configured `PORT` (default `4000`). Run `npm run db:push` once before the first production start.

## Included modules

- JWT authentication and bcrypt password hashing
- Healthcare worker, supervisor, and administrator permissions
- Mother registration, profiles, pregnancy status, risk level, and assignment
- Child registration linked to the mother
- ANC visits, clinical observations, next-visit scheduling, and risk flags
- Child growth and nutrition database support
- Vaccination schedules with due, completed, and missed states
- Unified ANC, vaccination, and assistance reminder queue
- Assistance calls, home visits, referrals, counselling, and resolution tracking
- Operational dashboard and six-month reports
- CSV report export
- Optional Resend email delivery endpoint
- Responsive desktop, tablet, and mobile interface
- Seeded demonstration data for immediate evaluation

## Optional email reminders

Set these values in the environment or a root `.env` file before starting Docker Compose:

```env
RESEND_API_KEY=re_your_key
EMAIL_FROM=Janani Swasthya <verified-sender@example.com>
```

The sender must be verified in Resend. The application remains fully usable without an email key; its internal reminder queue still works.

## Project structure

```text
janani-swasthya/
├── server/                 Express API and Prisma client
│   ├── index.js
│   └── prisma/
│       ├── schema.prisma
│       └── seed.js
├── web/                    React, Vite, Zustand and Recharts UI
│   └── src/
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Important production notes

This is a coursework-ready implementation, not a certified medical device. Before handling real patient information, use a strong secret, HTTPS, managed backups, restricted database access, audit retention, privacy review, disaster recovery, user training, and Nepal-specific health-data governance approval. Replace demonstration identities before deployment.
