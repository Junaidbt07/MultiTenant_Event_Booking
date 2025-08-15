import { isAdmin } from '@/access';
import { populateTenant } from '@/app/hooks/tenant';
import { CollectionConfig } from 'payload';

export const BookingLogs: CollectionConfig = {
  slug: 'booking-logs',
  admin: {
    hidden: ({ user }) => user?.role === 'attendee',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      
      const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
      
      if (user.role === 'organizer' || user.role === 'admin') {
        return { tenant: { equals: tenantId } };
      }
      return false;
    },
    create: () => false, // Logs are system-generated
    update: isAdmin,
    delete: isAdmin
  },
  hooks: {
    beforeValidate: [populateTenant],
  },
  fields: [
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      required: true,
    },
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
    },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'Create Request', value: 'create_request' },
        { label: 'Auto Waitlist', value: 'auto_waitlist' },
        { label: 'Auto Confirm', value: 'auto_confirm' },
        { label: 'Promote from Waitlist', value: 'promote_from_waitlist' },
        { label: 'Cancel Confirmed', value: 'cancel_confirmed' }
      ],
      required: true,
    },
    {
      name: 'note',
      type: 'textarea',
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