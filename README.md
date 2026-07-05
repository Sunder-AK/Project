# AI-Assisted Internal Request Documentation & Tracking System

## Overview
A modern enterprise internal request management system that captures internal requests from multiple channels and uses AI to convert raw notes into professional structured request documentation.

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, ShadCN-inspired components, Recharts
- **Backend:** Node.js with Express, REST APIs
- **Database:** PostgreSQL
- **Auth:** JWT-based with role-based access control

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup

**Quick Start (both services together)**
```bash
cd d:\\Project
npm install
npm run dev
```

1. **Database Setup**
   ```bash
   # Create the database
   createdb request_tracker
   
   # Run migrations
   cd backend
   npm install
   npm run migrate
   npm run seed
   ```

2. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Default Accounts

| Role       | Email                  | Password    |
|------------|------------------------|-------------|
| Admin      | admin@company.com      | admin123    |
| Supervisor | smartasundar@gmail.com| super123    |
| Supervisor | supervisor2@company.com| super123    |
| Supervisor | supervisor3@company.com| super123    |
| User       | aishwaryadharmar9@gmail.com      | user123     |
| User       | user2@company.com      | user123     |
