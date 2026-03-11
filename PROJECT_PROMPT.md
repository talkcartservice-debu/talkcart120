# Vetora (Talkcart) Project Prompt

This document provides a comprehensive overview of the Vetora monorepo for AI agents and developers. It serves as a unified context source for understanding the architecture, tech stack, and core functionalities of the platform.

---

## 🏗️ Monorepo Architecture

The project is organized into three main applications and a root-level management structure:

- **[./backend/](./backend/)**: Node.js/Express API server. The core engine handling data, authentication, and real-time services.
- **[./frontend/](./frontend/)**: Next.js 14 user-facing application. The primary interface for social networking and marketplace.
- **[./super-admin/](./super-admin/)**: Next.js 14 administrative dashboard. Used for platform-wide management and moderation.

---

## 🚀 Unified Tech Stack

### 🔹 Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM), Redis (Caching)
- **Real-time**: Socket.IO
- **Auth**: JWT (Access/Refresh), OAuth (Google/Apple), Biometrics (WebAuthn), SIWE
- **Storage**: Cloudinary (Media)
- **Validation**: Joi

### 🔹 Frontend & Super Admin
- **Framework**: Next.js 14 (App & Pages Router)
- **Language**: TypeScript
- **UI**: Material-UI (MUI), Tailwind CSS, Framer Motion
- **State/Data**: React Context, TanStack Query (React Query)
- **Web3**: ethers.js, wagmi, viem
- **PWA**: Service Workers for offline and mobile installation support

---

## 🔧 Core Features

1.  **SocialFi Feed**: A dynamic feed with posts, comments, and reactions, integrated with Web3 identity.
2.  **Multi-Vendor Marketplace**: Comprehensive product listing, filtering, and vendor KYC management.
3.  **Real-time Messaging**: Secure 1:1 and group chats with admin moderation capabilities.
4.  **Web3 Integration**: Wallet connectivity, Sign-In with Ethereum, and DAO/Governance hooks.
5.  **PWA Support**: Fully installable as a mobile application with specialized installation guides.

---

## 📂 Key Directory Structure

```text
/ (root)
├── backend/                # Express.js Server
│   ├── models/             # Mongoose Schemas (User, Post, Product, etc.)
│   ├── routes/             # API Endpoints (/api/v1/...)
│   ├── services/           # Business logic
│   └── middleware/         # Auth, validation, error handling
├── frontend/               # Next.js User App
│   ├── components/         # UI Components
│   ├── pages/              # Routing
│   ├── src/lib/api.ts      # Core API client
│   └── public/             # Static assets (including Service Worker)
└── super-admin/            # Next.js Admin Dashboard
    ├── components/         # Admin-specific dashboards (User, Vendor, Payments)
    └── src/services/       # Admin-specific API integration
```

---

## 📡 API & Communication

- **Base URL**: `/api/v1/`
- **Standard Response**: `{ success: boolean, data?: any, error?: string }`
- **WebSockets**: Socket.IO for real-time notifications and chat.
- **Authentication Flow**:
    1. JWT Access Token (Short-lived)
    2. JWT Refresh Token (Stored securely)
    3. Middleware-level role verification (User vs. Admin)

---

## 🛠️ Operations & Setup

### Core Commands
- **Install All**: Run `npm install` in `backend/`, `frontend/`, and `super-admin/`.
- **Start Backend**: `cd backend && npm run dev` (Port 8000)
- **Start Frontend**: `cd frontend && npm run dev` (Port 4000)
- **Start Admin**: `cd super-admin && npm run dev` (Port 4100)

### Critical Environment Variables
- `MONGODB_URI`: Connection string for MongoDB.
- `JWT_SECRET` & `REFRESH_TOKEN_SECRET`: Keys for secure token generation.
- `CLOUDINARY_*`: Credentials for media hosting.
- `NEXT_PUBLIC_API_URL`: Points the frontend to the backend API.

---

## 🔐 Security & Best Practices
- **Never** commit `.env` files.
- **Always** use `fetchWithAuth` (or equivalent) for authenticated frontend requests.
- **Ensure** schema validation (Joi/Mongoose) is present for all incoming data.
