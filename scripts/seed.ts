// scripts/seed.ts
import 'dotenv/config';
import { getPayload } from 'payload';
import type { CollectionSlug, Payload } from 'payload';
import config from '@/payload.config';
import { Tenant, User } from '@/payload-types';

// Validate environment variables
if (!process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET is not defined in .env');
}
if (!process.env.DATABASE_URI) {
  throw new Error('DATABASE_URI is not defined in .env');
}

let payload: Payload;

const seed = async () => {
  try {
    payload = await getPayload({
      config,
    });


    // Clear existing data
    const collections = [
      'booking-logs',
      'notifications',
      'bookings',
      'events',
      'users',
      'tenants',
    ];
    for (const col of collections) {
      await payload.delete({ collection: col as CollectionSlug, where: {} });
    }
    console.log('Cleared existing data');

    // Create Tenants
    const tenant1 = await payload.create({
      collection: 'tenants',
      data: { name: 'TechCorp Solutions' },
    });
    const tenant2 = await payload.create({
      collection: 'tenants',
      data: { name: 'EventMax Pro' },
    });
    console.log(' Created tenants:', tenant1.name, 'and', tenant2.name);

    // Helper to create users for a tenant
    const createUsers = async (
      tenantId: Tenant | number,
      organizerData: any,
      attendeeNames: string[],
    ) => {
      // Create admin
      const admin = await payload.create({
        collection: 'users',
        data: {
          name: `${organizerData.name.split(' ')[0]} Admin`,
          email: `admin@${organizerData.email.split('@')[1]}`,
          password: 'password123',
          role: 'admin',
          tenant: tenantId,
        },
      });

      // Create organizer
      const organizer = await payload.create({
        collection: 'users',
        data: { ...organizerData, tenant: tenantId },
      });

      // Create attendees
      const attendees = [];
      for (let i = 0; i < attendeeNames.length; i++) {
        const attendee = await payload.create({
          collection: 'users',
          data: {
            name: attendeeNames[i],
            email: `${attendeeNames[i]
              .toLowerCase()
              .replace(/\s+/g, '.')}@${organizerData.email.split('@')[1]}`,
            password: 'password123',
            role: 'attendee',
            tenant: tenantId,
          },
        });
        attendees.push(attendee);
      }
      return { admin, organizer, attendees };
    };

    // Create Users
    const tenant1Users = await createUsers(
      tenant1.id,
      {
        name: 'Alice Johnson',
        email: 'alice.organizer@techcorp.com',
        password: 'password123',
        role: 'organizer',
      },
      ['John Doe', 'Sarah Wilson', 'Mike Chen'],
    );

    const tenant2Users = await createUsers(
      tenant2.id,
      {
        name: 'David Martinez',
        email: 'david.organizer@eventmax.com',
        password: 'password123',
        role: 'organizer',
      },
      ['James Smith', 'Maria Garcia', 'Robert Taylor'],
    );

    console.log('Created users for both tenants');

    // Helper to create events
    const createEvents = async (tenantId: Tenant | number, organizerId: User) => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 7);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 14);

      const event1 = await payload.create({
        collection: 'events',
        data: {
          title: 'Event 1',
          description: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    { type: 'text', text: 'Some event details...', version: 1 },
                  ],
                  version: 1,
                },
              ],
              version: 1,
              direction: 'ltr',
              format: '',
              indent: 0,
            },
          },
          date: futureDate1.toISOString(),
          capacity: 1,
          organizer: organizerId,
          tenant: tenantId,
        },
      });

      const event2 = await payload.create({
        collection: 'events',
        data: {
          title: 'Event 2',
          description: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    { type: 'text', text: 'Some event details...', version: 1 },
                  ],
                  version: 1,
                },
              ],
              version: 1,
              direction: 'ltr',
              format: '',
              indent: 0,
            },
          },
          date: futureDate2.toISOString(),
          capacity: 2,
          organizer: organizerId,
          tenant: tenantId,
        },
      });

      return [event1, event2];
    };

    const tenant1Events = await createEvents(
      tenant1.id,
      tenant1Users.organizer,
    );
    const tenant2Events = await createEvents(
      tenant2.id,
      tenant2Users.organizer,
    );

    console.log('Created events for both tenants');

    // Booking simulations
    console.log('Starting booking simulations...');

    const createBooking = async (event: any, user: any, tenantId: any) => {
      return await payload.create({
        collection: 'bookings',
        data: { event: event.id, user: user.id, tenant: tenantId },
      });
    };

    // Tenant 1 Event 1 bookings
    for (let i = 0; i < tenant1Users.attendees.length; i++) {
      await createBooking(tenant1Events[0], tenant1Users.attendees[i], tenant1.id);
    }

    // Tenant 1 Event 2 partial bookings
    for (let i = 0; i < 2; i++) {
      await createBooking(tenant1Events[1], tenant1Users.attendees[i], tenant1.id);
    }

    // Tenant 2 Event 1 bookings
    for (let i = 0; i < tenant2Users.attendees.length; i++) {
      await createBooking(tenant2Events[0], tenant2Users.attendees[i], tenant2.id);
    }

    // Tenant 2 Event 2 single booking
    await createBooking(tenant2Events[1], tenant2Users.attendees[0], tenant2.id);

    console.log('Created booking scenarios');

    // Function to log all users grouped by role
    const logUsersByTenant = async (tenantId: any, tenantName: string) => {
      const allUsers = await payload.find({
        collection: 'users',
        where: { tenant: { equals: tenantId } },
        limit: 100,
      });

      console.log(` Users for tenant: ${tenantName}`);
      const roles: Record<string, any[]> = {};

      allUsers.docs.forEach((user) => {
        if (!roles[user.role]) roles[user.role] = [];
        roles[user.role].push(user);
      });

      for (const role in roles) {
        console.log(`\nRole: ${role}`);
        roles[role].forEach((u) =>
          console.log(`- ${u.name} (${u.email})`),
        );
      }
    };

    // Log users for both tenants
    await logUsersByTenant(tenant1.id, tenant1.name);
    await logUsersByTenant(tenant2.id, tenant2.name);

    console.log('Seed process completed successfully!');
  } catch (error) {
    console.error('Seed process failed:', error);
  }
};

seed();
