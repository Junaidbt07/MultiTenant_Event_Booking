import type { Access, AccessResult, FieldAccess } from "payload"

// Check if user is admin
export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === "admin"
}

// Check if user is organizer or admin
export const isOrganizerOrAdmin: Access = ({ req: { user } }) => {
  return user?.role === "organizer" || user?.role === "admin"
}


// SPECIFIC ACCESS FUNCTION FOR NOTIFICATIONS
export const canAccessOwnNotifications: Access = ({ req: { user }}) => {
  if (!user) return false
  
  const tenantId = typeof user.tenant === "object" ? user.tenant.id : user.tenant
  
  if (user.role === "admin" || user.role === "organizer") {
    // Admin/organizer can see all notifications in their tenant
    return { tenant: { equals: tenantId } } as AccessResult
  }
  
  // Attendees can only see notifications where they are the user
  return { 
    and: [
      { user: { equals: user.id } },
      { tenant: { equals: tenantId } }
    ]
  }
}

// Check if user can access tenant data
export const canAccessTenant: Access = ({ req: { user } }) => {
  if (!user) return false
  const tenantId = typeof user.tenant === "object" ? user.tenant.id : user.tenant
  return { tenant: { equals: tenantId } }
}

// Field-level access for tenant
export const tenantFieldAccess: FieldAccess = ({ req: { user } }) => {
  return user?.role === "admin"
}