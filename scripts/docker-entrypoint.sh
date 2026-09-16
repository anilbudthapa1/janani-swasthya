#!/bin/sh
set -eu
npx --prefix server prisma db push --schema=server/prisma/schema.prisma
npm run db:seed --prefix server
npm start --prefix server
