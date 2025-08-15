// src/collections/Notifications.ts
import { canAccessOwnNotifications, isAdmin } from '@/access';
import { populateTenant } from '@/app/hooks/tenant';
import { CollectionConfig } from 'payload';

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  access: {
    // USE THE NEW NOTIFICATION-SPECIFIC ACCESS FUNCTION
    read: canAccessOwnNotifications,
    create: () => false, // System generated only
    update: ({ req: { user } }) => {
      if (!user) return false;
     
      // Users can mark their own notifications as read
      if (user.role === 'admin') {
        const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
        return { tenant: { equals: tenantId } } as any;
      }
     
      // Non-admins can only update their own notifications
      return { 
        and: [
          { user: { equals: user.id } },
          { tenant: { equals: typeof user.tenant === 'object' ? user.tenant.id : user.tenant } }
        ]
      };
    },
    delete: isAdmin
  },
  hooks: {
    beforeValidate: [populateTenant],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Booking Confirmed', value: 'booking_confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Waitlist Promoted', value: 'waitlist_promoted' },
        { label: 'Booking Canceled', value: 'booking_canceled' }
      ],
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
  ],
  timestamps: true,
};