// src/collections/Users.ts
import { isAdmin } from "@/access";
import { populateTenant } from "@/app/hooks/tenant";
import { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    // Fix the read access - don't query tenant on users, just check user ID
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') {
        // Admin can see all users in their tenant
        const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
        return { tenant: { equals: tenantId } };
      }
      // Non-admins can only see themselves
      return { id: { equals: user.id } } as any;
    },
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') {
        const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
        return { tenant: { equals: tenantId } } as any;
      }
      // Users can update themselves
      return { id: { equals: user.id } };
    },
    delete: isAdmin,
  },
  auth: true,
  hooks: {
    beforeValidate: [populateTenant],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Attendee', value: 'attendee' },
        { label: 'Organizer', value: 'organizer' },
        { label: 'Admin', value: 'admin' }
      ],
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
  ],
};