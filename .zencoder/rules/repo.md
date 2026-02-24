---
description: Repository Information Overview
alwaysApply: true
---

# Vetora Repository Information Overview

## Repository Summary
Vetora is a modern social commerce platform (SocialFi) featuring a marketplace, streaming, DAO capabilities, and advanced messaging. The project is organized as a monorepo with a React/Next.js frontend, a Node.js/Express backend, and a dedicated super-admin dashboard.

## Repository Structure
- **frontend/**: Next.js application providing the user interface for social networking, marketplace, and messaging.
- **backend/**: Express.js server handling API requests, authentication, database interactions (MongoDB), and real-time communication (Socket.IO).
- **super-admin/**: Next.js application for administrative management of the platform.

### Main Repository Components
- **Frontend**: Built with Next.js 14, MUI, and Tailwind CSS. Uses Service Workers for PWA support.
- **Backend**: Built with Node.js, Express, and Mongoose. Handles OAuth (Google/Apple) and Biometric authentication.
- **Database**: MongoDB for primary storage.
- **Messaging**: Socket.IO for real-time messaging and notifications.
- **File Storage**: Cloudinary for media assets.

---

## Projects

### Frontend
**Configuration File**: `frontend/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Version**: Node.js >=18.0.0  
**Build System**: Next.js (SWC)  
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- `next`: 14.2.15
- `react`: 18.3.1
- `@mui/material`: 6.5.0
- `ethers`: 6.13.4
- `framer-motion`: 12.23.12
- `socket.io-client`: 4.8.1
- `@tanstack/react-query`: 5.59.16
- `wagmi`, `viem`: Web3 integration

#### Authentication & Security
- **OAuth**: Google and Apple Sign-In integrated.
- **Biometrics**: Support for WebAuthn/Biometric authentication.
- **Service Worker**: PWA support via `frontend/public/service-worker.js`. 
  - *Fix*: Robust error handling in `fetch` events to prevent `TypeError: Failed to convert value to 'Response'`.
- **Script Loading**: Retry mechanism (up to 3 attempts) for external scripts like Google Identity Services to handle network/ad-blocker issues.

#### Build & Installation
```bash
cd frontend && npm install
npm run dev # Starts on port 4000
npm run build
```

---

### Backend
**Configuration File**: `backend/package.json`

#### Language & Runtime
**Language**: JavaScript  
**Version**: Node.js >=18.0.0  
**Build System**: Node.js  
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- `express`: 4.18.2
- `mongoose`: 8.19.3
- `jsonwebtoken`: 9.0.2
- `socket.io`: 4.8.1
- `cloudinary`: 1.41.3
- `ethers`: 6.8.1
- `@simplewebauthn/server`: 13.1.2 (Biometric Auth)
- `siwe`: 2.1.4 (Sign-In with Ethereum)

#### API Specification
- **Base URL**: `/api`
- **Authentication**: JWT-based with Refresh Token support.
- **CORS**: Configured to allow frontend ports (3000, 4000, 4100).

#### Build & Installation
```bash
cd backend && npm install
npm run dev # Starts with nodemon
```

---

## Operations & Maintenance

### Key Resources
- **Public Assets**: `frontend/public/`
- **Service Worker**: `frontend/public/service-worker.js`
- **API Client**: `frontend/src/lib/api.ts` (Handles timeouts, retries, and token refreshing).
- **Auth Logic**: `frontend/src/contexts/AuthContext.tsx` and `backend/routes/auth.js`.

### Validation
- **Linting**: `npm run lint` in frontend.
- **Type Checking**: `npm run type-check` in frontend.
