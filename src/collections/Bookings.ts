// src/collections/Bookings.ts
import { CollectionConfig } from 'payload';
import { checkEventCapacity, handleBookingStatusChange } from '../app/hooks/booking';
import { populateTenant } from '@/app/hooks/tenant';

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'status',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      
      const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
      
      if (user.role === 'admin' || user.role === 'organizer') {
        return { tenant: { equals: tenantId } } as any ;
      }
      
      // Attendees can only see their own bookings
      return {
        user: { equals: user.id },
        tenant: { equals: tenantId }
      };
    },
    create: ({ req: { user } }) => {
      return !!user && user.role === 'attendee';  
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      
      const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
      
      if (user.role === 'admin' || user.role === 'organizer') {
        return { tenant: { equals: tenantId }, status: { not_equals: 'waitlisted' } } as any;
      }
      
      return {
        user: { equals: user.id },
        tenant: { equals: tenantId },
        status: { not_equals: 'waitlisted' }
      };
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') {
        const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
        return { tenant: { equals: tenantId } };
      }
      return false; // Only admins can delete bookings
    },
  },
  hooks: {
    beforeValidate: [populateTenant],
    beforeChange: [checkEventCapacity],
    afterChange: [handleBookingStatusChange],
    // afterUpdate: [
    //   async ({ req, doc, previousDoc }: any) => {
    //     const { payload } = req;
        
    //     // Only promote if a confirmed booking was canceled
    //     if (doc.status === 'canceled' && previousDoc?.status === 'confirmed') {
    //       const tenantId = typeof doc.tenant === 'object' ? doc.tenant.id : doc.tenant;
          
    //       try {
    //         const waitlistedBookings = await payload.find({
    //           collection: 'bookings',
    //           where: {
    //             and: [
    //               { event: { equals: doc.event } },
    //               { status: { equals: 'waitlisted' } },
    //               { tenant: { equals: tenantId } },
    //             ],
    //           },
    //           sort: 'createdAt', // Oldest first
    //           limit: 1,
    //         });
            
    //         if (waitlistedBookings.docs.length > 0) {
    //           const oldest = waitlistedBookings.docs[0];
              
    //           await payload.update({
    //             collection: 'bookings',
    //             id: oldest.id,
    //             data: { status: 'confirmed' },
    //             context: { isPromotion: true },
    //           });
              
    //           payload.logger.info(`Promoted booking ${oldest.id} from waitlist`);
    //         }
    //       } catch (error) {
    //         payload.logger.error(`Error promoting from waitlist: ${error}`);
    //       }
    //     }
    //   },
    // ],
  } as any,
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }) => user?.id,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Canceled', value: 'canceled' }
      ],
      defaultValue: 'waitlisted',
      required: true,
      admin: {
        // Attendees cannot change to other statuses
        condition: (data, siblingData, { user }) => {
          if (user?.role === 'attendee') {
            return false; // Hide status field for attendees in create/edit
          }
          return true;
        }
      }
    },
  ],
  timestamps: true,
};