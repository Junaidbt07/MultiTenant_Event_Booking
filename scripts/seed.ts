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
    console.log('✅ Cleared existing data');

    // Create Tenants
    const tenant1 = await payload.create({
      collection: 'tenants',
      data: { name: 'TechCorp Solutions' },
    });
    const tenant2 = await payload.create({
      collection: 'tenants',
      data: { name: 'EventMax Pro' },
    });
    console.log('✅ Created tenants:', tenant1.name, 'and', tenant2.name);

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

    // Create Users for Tenant 1
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

    // Create Users for Tenant 2
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

    console.log('✅ Created users for both tenants');

    // Helper to create events
    const createEvents = async (tenantId: Tenant | number, organizerId: User) => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 7);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 14);

      const event1 = await payload.create({
        collection: 'events',
        data: {
          title: `Tech Conference 2024`,
          description: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    { type: 'text', text: 'Join us for an exciting tech conference with industry leaders and networking opportunities.', version: 1 },
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
          capacity: 2, // Small capacity to test waitlist
          organizer: organizerId,
          tenant: tenantId,
        },
      });

      const event2 = await payload.create({
        collection: 'events',
        data: {
          title: `Workshop Series`,
          description: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    { type: 'text', text: 'Hands-on workshop series covering the latest technologies and best practices.', version: 1 },
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
          capacity: 5, // Larger capacity
          organizer: organizerId,
          tenant: tenantId,
        },
      });

      return [event1, event2];
    };

    // Create Events for both tenants
    const tenant1Events = await createEvents(tenant1.id, tenant1Users.organizer);
    const tenant2Events = await createEvents(tenant2.id, tenant2Users.organizer);

    console.log('✅ Created events for both tenants');

    // Function to log all users grouped by role
    const logUsersByTenant = async (tenantId: any, tenantName: string) => {
      const allUsers = await payload.find({
        collection: 'users',
        where: { tenant: { equals: tenantId } },
        limit: 100,
      });

      console.log(`\n📋 Users for tenant: ${tenantName}`);
      const roles: Record<string, any[]> = {};

      allUsers.docs.forEach((user) => {
        if (!roles[user.role]) roles[user.role] = [];
        roles[user.role].push(user);
      });

      for (const role in roles) {
        console.log(`\n  👤 Role: ${role}`);
        roles[role].forEach((u) =>
          console.log(`     - ${u.name} (${u.email})`),
        );
      }
    };

    // Log users for both tenants
    await logUsersByTenant(tenant1.id, tenant1.name);
    await logUsersByTenant(tenant2.id, tenant2.name);

    console.log('Seed process completed successfully!');
    console.log('Demo Credentials:');
    console.log('===============================');
    console.log('Tenant 1 (TechCorp Solutions):');
    console.log('  Admin: admin@techcorp.com / password123');
    console.log('  Organizer: alice.organizer@techcorp.com / password123');
    console.log('  Attendees: john.doe@techcorp.com / password123');
    console.log('             sarah.wilson@techcorp.com / password123');
    console.log('             mike.chen@techcorp.com / password123');
    console.log('\nTenant 2 (EventMax Pro):');
    console.log('  Admin: admin@eventmax.com / password123');
    console.log('  Organizer: david.organizer@eventmax.com / password123');
    console.log('  Attendees: james.smith@eventmax.com / password123');
    console.log('             maria.garcia@eventmax.com / password123');
    console.log('             robert.taylor@eventmax.com / password123');
    
  } catch (error) {
    console.error('❌ Seed process failed:', error);
  }
};

seed();