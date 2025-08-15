// src/collections/Events.ts
import {  isOrganizerOrAdmin } from "@/access";
import { populateTenant } from "@/app/hooks/tenant";
import { CollectionConfig } from "payload";

export const Events: CollectionConfig = {
    slug: 'events',
    admin: {
        useAsTitle: 'title'
    },
    access: {
        // IMPORTANT: Attendees should see ALL events in their tenant to book them
        read: ({ req: { user } }) => {
            if (!user) return false;
            
            const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
            return { tenant: { equals: tenantId } };
        },
        create: isOrganizerOrAdmin,
        update: isOrganizerOrAdmin,
        delete: ({ req: { user } }) => {
            if (!user || user.role !== 'admin') return false;
            const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
            return { tenant: { equals: tenantId } };
        }
    },
    hooks: {
        beforeValidate: [populateTenant],
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            required: true
        },
        {
            name: 'description',
            type: 'richText',
            required: true
        },
        {
            name: 'date',
            type: 'date',
            required: true
        },
        {
            name: 'capacity',
            type: 'number',
            required: true,
            min: 1
        },
        {
            name: 'organizer',
            type: 'relationship',
            relationTo: 'users',
            required: true,
            defaultValue: ({ user }) => user?.id,
        },
        {
            name: 'tenant',
            type: 'relationship',
            relationTo: 'tenants',
            required: true
        }
    ],
    timestamps: true
}