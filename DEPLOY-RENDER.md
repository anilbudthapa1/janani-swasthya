# Janani Swasthya — Render Deployment

This package is ready for a Render Blueprint deployment.

## Resources created

- Free Render Web Service: `janani-swasthya`
- Free Render PostgreSQL: `janani-swasthya-db`
- Region: Singapore
- Health check: `/api/health`
- `DATABASE_URL` is injected automatically from Render Postgres.
- `JWT_SECRET` is generated automatically by Render.
- The Docker entrypoint runs `prisma db push`, seeds the demonstration data, and starts the Express server.

## Demo login

Password for all three demo accounts: `Admin@123`

- `worker@janani.gov.np`
- `supervisor@janani.gov.np`
- `admin@janani.gov.np`

## Expected URL

Render assigns an HTTPS hostname after creation, normally similar to:

`https://janani-swasthya.onrender.com`

If the exact name is already taken, Render adds a suffix.

## Important

This deployment contains demonstration healthcare data only. Do not use real patient data for coursework hosting.
