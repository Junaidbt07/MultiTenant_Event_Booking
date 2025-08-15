import { User } from "@/payload-types";
import { CollectionBeforeValidateHook } from "payload";

export const populateTenant: CollectionBeforeValidateHook = ({ req, data }) => {
  const user = req.user as User | undefined;
  
  // Ensure data exists and user is logged in
  if (!data || !user || data.tenant) return;
  
  // Set the tenant from the authenticated user
  data.tenant = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
};
