# Multi-Tenant Event Booking System

🚀 **Live Demo**: [https://multitenant-event-booking.onrender.com/](https://multitenant-event-booking.onrender.com/)
- **Admin Panel**: [https://multitenant-event-booking.onrender.com/admin/login](https://multitenant-event-booking.onrender.com/admin/login)
- **Dashboard**: [https://multitenant-event-booking.onrender.com/dashboard](https://multitenant-event-booking.onrender.com/dashboard)

## Overview

This project is a multi-tenant event booking backend built with Payload CMS, designed to manage events, users, and bookings across multiple organizations (tenants) with complete data isolation. The system operates by enforcing event capacity limits, automatically managing waitlists, and promoting the oldest waitlisted booking when a spot becomes available. It generates in-app notifications for status changes and maintains a detailed log of all booking actions. Organizers can utilize a dashboard that displays upcoming events, including booking counts, circular progress indicators for capacity usage, and summary analytics.

The backend functions through Payload's access control and hooks, ensuring multi-tenancy and adherence to business rules. It includes a seed script for testing and a organizer dashboard, all integrated seamlessly to support event management workflows.

## Features

- **Multi-Tenant Support**: Isolated data for each tenant.
- **Role-Based Access Control**: Admins, organizers, and attendees with specific permissions.
- **Event Management**: Create events with title, description, date, capacity, and organizer.
- **Booking System**: Automatic status management (confirmed, waitlisted, canceled) with waitlist promotion.
- **Notifications**: In-app notifications for booking status changes.
- **Booking Logs**: Audit trail for all booking actions.
- **Organizer Dashboard**: Displays upcoming events, booking statistics, and summary analytics.
- **Seed Script**: Populates sample data for two tenants with users, events, and bookings.

## Prerequisites

- Node.js (^18.20.2 or >=20.9.0)
- PNPM
- PostgreSQL database
- Environment variables in `.env` (copy from `.env.example`):

  ```
  PAYLOAD_SECRET=your-secret-key
  DATABASE_URI=postgres://username:password@localhost:5432/database_name
  ```

## Setup Instructions

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/MultiTenant_Event-Booking.git
   cd MultiTenant_Event-Booking
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment**: Copy `.env.example` to `.env` and update with your database credentials and secret.

4. **Generate Types**:

   ```bash
   npm run generate:types
   ```

5. **Run Development Server**:

   ```bash
   npm run dev
   ```

   Access the admin panel at `http://localhost:3000/admin`.

6. **Seed the Database**:

   ```bash
   npm run seed
   ```

   This clears existing data and populates sample tenants, users, events, and bookings.

## Architecture

The project follows a modular structure using Payload CMS for the backend and Next.js for the frontend dashboard.

### File/Folder Structure

- **src/**:
  - **app/**:
    - `dashboard/page.tsx`: Next.js page for the organizer dashboard.
    - `components/OrganizerDashboard.tsx`: React component for the dashboard UI.
    - `page.tsx`: Homepage or landing page.
    - `layout.tsx`: Layout component for the application.
    - **api/**: Custom API endpoints
      - `book-event/route.ts`: Book event API
      - `cancel-booking/route.ts`: Cancel booking API
      - `dashboard/route.ts`: Dashboard data API
      - `my-bookings/route.ts`: User bookings API
      - `my-notifications/route.ts`: User notifications API
      - `notifications/[id]/read/route.ts`: Mark notification as read API
  - **hooks/**:
    - `booking.ts`: Custom hooks for booking logic including capacity checks and waitlist promotion.
    - `tenants.ts`: Custom hooks for tenant-related logic.
  - **collections/**:
    - `Bookings.ts`: Defines the bookings collection with access control and hooks.
    - `BookingLogs.ts`: Defines the booking logs collection for audit trails.
    - `Events.ts`: Defines the events collection with organizer relationships.
    - `Notifications.ts`: Defines the notifications collection with user targeting.
    - `Users.ts`: Defines the users collection with role-based access.
    - `Tenants.ts`: Defines the tenants collection for multi-tenancy.
  - **access/**:
    - `index.ts`: Reusable access control functions for multi-tenant security.
  - `payload.config.ts`: Main Payload configuration with collections and plugins.
  - `payload-types.ts`: Generated TypeScript types for Payload collections.
- **scripts/**:
  - `seed.ts`: Seed script for sample data across multiple tenants.

### Key Logic

- **Multi-Tenancy**: Every record links to a tenant. Access control hooks ensure users only access their tenant's data.
- **Booking Hooks**: 
  - `checkEventCapacity`: Assigns booking status (confirmed/waitlisted) based on event capacity
  - `handleBookingStatusChange`: Manages notifications, logs, and waitlist promotions
- **Access Control**: Role-based functions (`isAdmin`, `isOrganizerOrAdmin`, `canAccessOwnNotifications`) enforce permissions.
- **Dashboard**: Fetches aggregated data via `GET /api/dashboard`, rendered with circular progress and stat cards.
- **Waitlist Management**: Automatic promotion of oldest waitlisted user when confirmed booking is canceled.

### API Endpoints

The system provides the following custom API endpoints:

- **POST** `/api/book-event` - Book an event (creates confirmed or waitlisted booking)
- **POST** `/api/cancel-booking` - Cancel a booking (promotes from waitlist if applicable)
- **GET** `/api/my-bookings` - Get user's bookings
- **GET** `/api/my-notifications` - Get user's notifications
- **POST** `/api/notifications/:id/read` - Mark notification as read
- **GET** `/api/dashboard` - Get organizer dashboard data (events, stats, analytics)

All endpoints enforce multi-tenancy and role-based access control.

## Sample Workflows

### Booking an Event

1. Log in as an attendee via the admin panel (`/admin`).
2. Create a booking for an event through the `Bookings` collection.
   - If seats are available: Status is set to `confirmed`, a notification is sent, and a log is created.
   - If full: Status is set to `waitlisted`, a notification is sent, and a log is created.

### Canceling a Booking

1. Log in as an organizer or admin via the admin panel.
2. Update a confirmed booking's status to `canceled` in the `Bookings` collection.
3. The system automatically promotes the oldest waitlisted booking, sends a notification, and creates a log.

### Viewing Dashboard

1. Log in as an organizer via the admin panel.
2. Visit `/dashboard` to see upcoming events with counts, progress circles, and summary stats fetched via `GET /api/dashboard`.

### Notifications

1. Log in as a user and view notifications in the `Notifications` collection via the admin panel.
2. Notifications are automatically generated for all booking status changes.
3. Use the API endpoint `POST /api/notifications/:id/read` to mark notifications as read.

## Demo Credentials

After running `npm run seed`, use these credentials to log in via `/admin`:

### Tenant 1: TechCorp Solutions

- **Admin**: Email: `admin@techcorp.com`, Password: `password123`
- **Organizer**: Email: `alice.organizer@techcorp.com`, Password: `password123`
- **Attendees**:
  - John Doe: `john.doe@techcorp.com`, Password: `password123`
  - Sarah Wilson: `sarah.wilson@techcorp.com`, Password: `password123`
  - Mike Chen: `mike.chen@techcorp.com`, Password: `password123`

### Tenant 2: EventMax Pro

- **Admin**: Email: `admin@eventmax.com`, Password: `password123`
- **Organizer**: Email: `david.organizer@eventmax.com`, Password: `password123`
- **Attendees**:
  - James Smith: `james.smith@eventmax.com`, Password: `password123`
  - Maria Garcia: `maria.garcia@eventmax.com`, Password: `password123`
  - Robert Taylor: `robert.taylor@eventmax.com`, Password: `password123`

## Live Demo Access

🌐 **Try it live**: [https://multitenant-event-booking.onrender.com/admin](https://multitenant-event-booking.onrender.com/admin)

Use any of the demo credentials above to explore the system. The live demo includes:
- Pre-seeded data for both tenants
- Working booking system with waitlist management
- Real-time notifications
- Organizer dashboard with analytics
- Full multi-tenant isolation

## Deployment Guide

This project is deployed on **Render** and is production-ready.

### Deploy Your Own:

1. **Fork this repository** to your GitHub account
2. **Create a Render account** and import the repository
3. **Set up environment variables** in the Render dashboard:
   ```
   PAYLOAD_SECRET=your-secret-key-here
   DATABASE_URI=your-postgresql-connection-string
   ```
4. **Connect to a PostgreSQL provider** (Neon, Supabase, or Render PostgreSQL)
5. **Deploy**: Render handles build and deployment automatically
6. **Run the seed script** (optional) to populate sample data

### Environment Setup:
- Uses PostgreSQL with `@payloadcms/db-postgres`
- Deployed on Render with Node.js runtime
- Environment variables managed through Render dashboard
- Automatic builds on git push

The live demo runs on **Render** and demonstrates full production capabilities including database persistence, real-time updates, and secure multi-tenant access control.
