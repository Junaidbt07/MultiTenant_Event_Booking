# Multi-Tenant Event Booking System

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

## 

## Prerequisites

- Node.js (^18.20.2 or &gt;=20.9.0)

- PNPM

- PostgreSQL database

- Environment variables in `.env` (copy from `.env.example`):

  ```
  PAYLOAD_SECRET=your-secret-key
  DATABASE_URI=postgres://username:password@localhost:5432/database_name
  NEXT_PUBLIC_SERVER_URL=http://localhost:3000
  ```

## Setup Instructions

1. **Clone the Repository**:

   ```
   git clone https://github.com/your-username/weframetech-event-booking.git
   cd weframetech-event-booking
   ```

2. **Install Dependencies**:

   ```
   npm install
   ```

3. **Configure Environment**: Copy `.env.example` to `.env` and update with your database credentials and secret.

4. **Generate Types**:

   ```
   npm run generate:types
   ```

5. **Run Development Server**:

   ```
   npm run dev
   ```

   Access the admin panel at `http://localhost:3000/admin`.

6. **Seed the Database**:

   ```
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
  - **hooks/**:
    - `booking.ts`: Custom hooks for booking logic.
    - `tenants.ts`: Custom hooks for tenant-related logic.
  - **collections/**:
    - `Bookings.ts`: Defines the bookings collection.
    - `BookingLogs.ts`: Defines the booking logs collection.
    - `Events.ts`: Defines the events collection.
    - `Notifications.ts`: Defines the notifications collection.
    - `Users.ts`: Defines the users collection.
    - `Tenants.ts`: Defines the tenants collection.
  - `payload.config.ts`: Main Payload configuration with collections and plugins.
  - `payload-types.ts`: Generated TypeScript types for Payload collections.
  - **access/**:
    - `index.ts`: Reusable access control functions.
- **scripts/**:
  - `seed.ts`: Seed script for sample data.
- **documents/**:
  - Contains Google Docs file for API documentation submission.

### Key Logic

- **Multi-Tenancy**: Every record links to a tenant. Access control hooks (`tenantFilter`) ensure users only access their tenant's data.
- **Booking Hooks**: `beforeValidateHook` assigns status based on capacity; `afterChangeHook` handles notifications, logs, and promotions.
- **Access Control**: Role-based functions (`isAdmin`, `isOrganizer`, `isTenantUser`) enforce permissions.
- **Dashboard**: Fetches aggregated data via `GET /api/dashboard`, rendered with circular progress and stat cards.
- **Plugins**: Uses Payload's built-in plugins like `@payloadcms/richtext-lexical` for rich text and `@payloadcms/db-postgres` for the database.

No external plugins beyond Payload's ecosystem are used, ensuring high customizability.

### API Endpoints

The system provides the following custom API endpoint, integrated with Payload's RESTful architecture and authenticated via Payload's built-in auth system:

- **GET** `/api/dashboard`\
  Retrieves aggregated data for the organizer dashboard (upcoming events, booking stats).

  - Requires: Authenticated organizer role.

All endpoint enforces multi-tenancy and role-based access control, ensuring data isolation and security.

## Sample Workflows

### Booking an Event

1. Log in as an attendee via the admin panel (`/admin`).
2. Create a booking for an event through the `Bookings` collection.
   - If seats are available: Status is set to `confirmed`, a notification is sent, and a log is created.
   - If full: Status is set to `waitlisted`, a notification is sent, and a log is created.

### Canceling a Booking

1. Log in as an organizer or admin via the admin panel.
2. Update a confirmed booking’s status to `canceled` in the `Bookings` collection.
3. The system promotes the oldest waitlisted booking, sends a notification, and creates a log.

### Viewing Dashboard

1. Log in as an organizer via the admin panel.
2. Visit `/dashboard` to see upcoming events with counts, progress circles, and summary stats fetched via `GET /api/dashboard`.

### Notifications

1. Log in as a user and view notifications in the `Notifications` collection via the admin panel.
2. Mark notifications as read manually or through UI updates.

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

For reviewer access, use admin credentials above.

## Deployment Guide

This project is Vercel-ready as it uses Next.js with Payload embedded.

1. Push to GitHub (private repo).
2. Create a Vercel account and import the repo.
3. Set environment variables in Vercel (from `.env`): `PAYLOAD_SECRET`, `DATABASE_URI`, `NEXT_PUBLIC_SERVER_URL`.
4. Connect to a PostgreSQL provider (e.g., Vercel Postgres or neon).
5. Deploy: Vercel handles build and deployment automatically.
6. Access the live site; admin at `/admin`, dashboard at `/dashboard`.