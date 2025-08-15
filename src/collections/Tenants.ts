// src/collections/Tenants.ts
import { isAdmin } from "@/access";
import { CollectionConfig } from "payload";

export const Tenants: CollectionConfig = {
    slug: 'tenants',
    admin: {
        useAsTitle: 'name',
        // Don't hide tenants completely, just limit access
        hidden: ({ user }) => !user || user.role === 'attendee'
    },
    access: {
        // Allow read access for organizers and admins to see tenant dropdown
        read: ({ req: { user } }) => {
            if (!user) return false;
            if (user.role === 'admin' || user.role === 'organizer') {
                const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
                return { id: { equals: tenantId } };
            }
            return false;
        },
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true
        }
    ],
    timestamps: true
}