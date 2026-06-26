# Shoppy MongoDB Version

This project has been converted from Supabase to a MongoDB backend.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start MongoDB locally, or use MongoDB Atlas.

Local default:

```bash
mongodb://127.0.0.1:27017/shoppy
```

3. Update `.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:5000/api
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/shoppy
JWT_SECRET=change-this-secret-before-production
```

4. Start frontend and backend together:

```bash
npm run dev
```

Or separately:

```bash
npm run server
npm run client
```

## First admin setup

1. Go to `/admin/login`.
2. Enter your email and password.
3. Click **Claim First Admin Account**.
4. This works only when no admin exists in MongoDB.

## What changed

- Removed direct Supabase dependency from the frontend.
- Added `server/index.js` with Express + Mongoose models/routes.
- Added MongoDB seed data from the existing React data files.
- Replaced Supabase client with `src/lib/supabase.ts`, a compatibility API layer so the existing UI can keep working while using MongoDB.
- Added MongoDB environment variables.

## Important production notes

- Change `JWT_SECRET` before deployment.
- Use MongoDB Atlas for production.
- Add real file storage such as Cloudinary/S3 for product images and seller documents. The current compatibility layer previews uploaded files in-browser.
- Add stronger authorization rules before production: admin-only product management, seller-only own product management, and customer-only own orders.
