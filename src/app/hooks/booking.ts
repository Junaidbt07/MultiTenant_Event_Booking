// src/app/hooks/booking.ts
import { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload';
import { Event, User, Booking } from '@/payload-types';

type BookingAction = 'create_request' | 'auto_waitlist' | 'auto_confirm' | 'promote_from_waitlist' | 'cancel_confirmed';
type NotificationType = 'booking_confirmed' | 'waitlisted' | 'waitlist_promoted' | 'booking_canceled';

/**
 * This hook runs BEFORE a booking is saved to determine if it should be confirmed or waitlisted
 * It's the core logic that enforces event capacity limits
 */
export const checkEventCapacity: CollectionBeforeChangeHook = async ({ req, data, operation, context }) => {
  // Skip during seeding if requested
  if (context?.skipHooks) return data;

  // Only run on create, or update without explicit status
  if (operation === 'update' && data.status) return data;

  const { payload } = req;
  const eventId = data.event;

  if (!eventId) {
    payload.logger.error(`Missing eventId in booking data`);
    return data;
  }

  try {
    // Fetch the event to get its capacity limit
    const eventDoc = await payload.findByID({
      collection: 'events',
      id: eventId,
    }) as Event;

    if (!eventDoc) throw new Error('Event not found.');

    // Handle both object and ID formats for tenant relationships
    const user = req.user as User | null;
    const tenantId = user
      ? typeof user.tenant === 'object' ? user.tenant.id : user.tenant
      : data.tenant;

    // Count existing confirmed bookings for this event (tenant-isolated)
    const confirmedBookings = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { event: { equals: eventId } },
          { status: { equals: 'confirmed' } },
          { tenant: { equals: tenantId } },
        ],
      },
    });

    // This is the key business logic: confirm if space available, otherwise waitlist
    data.status = confirmedBookings.docs.length < eventDoc.capacity
      ? 'confirmed'
      : 'waitlisted';

  } catch (error) {
    payload.logger.error(`Error checking event capacity: ${error}`);
  }

  return data;
};

/**
 * This hook runs AFTER a booking changes and handles all the side effects:
 * - Creates notifications for users
 * - Logs all booking actions for audit trail
 * - Promotes waitlisted users when spots become available
 */
export const handleBookingStatusChange: CollectionAfterChangeHook = async ({ req, doc, previousDoc, operation, context }) => {
  const { payload } = req;

  // Skip hook if explicitly requested (prevents infinite loops)
  if (context?.skipHooks) return doc;

  // Guard: Ensure we have required IDs
  if (!doc?.id || !doc?.event || !doc?.user || !doc?.tenant) {
    payload.logger.error(`Missing required IDs for booking ${doc?.id || '(no id)'}`);
    return doc;
  }

  // Extract IDs from potential object relationships
  const tenantId = typeof doc.tenant === 'object' ? doc.tenant.id : doc.tenant;
  const userId = typeof doc.user === 'object' ? doc.user.id : doc.user;

  // Helper function to create notifications for users
  const createNotification = async (userId: User, type: NotificationType, title: string, message: string) => {
    try {
      await payload.create({
        collection: 'notifications',
        data: {
          user: userId,
          booking: doc.id,
          type,
          title,
          message,
          read: false,
          tenant: tenantId,
        },
        context: { skipHooks: true }, // Prevent infinite loops
      });
      console.log(`Notification created: ${type} for user ${userId}`);
    } catch (error) {
      payload.logger.error(`Failed to create notification: ${error}`);
      console.error(`Notification error:`, error);
    }
  };

  // Helper function to create audit logs for every booking action
  const createBookingLog = async (action: BookingAction, note: string) => {
    try {
      await payload.create({
        collection: 'booking-logs',
        data: {
          booking: doc.id,
          event: doc.event,
          user: doc.user,
          action,
          note,
          tenant: tenantId,
        },
        context: { skipHooks: true }, // Prevent infinite loops
      });
      console.log(`Booking log created: ${action}`);
    } catch (error) {
      payload.logger.error(`Failed to create booking log: ${error}`);
    }
  };

  /**
   * The most complex function - handles automatic waitlist promotion
   * When a confirmed booking is canceled, this finds the oldest waitlisted person
   * and promotes them using FIFO (First In, First Out) logic
   */
  const promoteFromWaitlist = async () => {
    try {
      console.log(`Starting waitlist promotion for event ${doc.event}`);
      
      // Get the event to check capacity
      const eventDoc = await payload.findByID({
        collection: 'events',
        id: doc.event,
      }) as Event;

      if (!eventDoc) {
        console.log(' Event not found for promotion');
        return;
      }

      // Recount confirmed bookings to ensure we have accurate capacity info
      const confirmedBookings = await payload.find({
        collection: 'bookings',
        where: {
          and: [
            { event: { equals: doc.event } },
            { status: { equals: 'confirmed' } },
            { tenant: { equals: tenantId } },
          ],
        },
      });

      console.log(` Current confirmed bookings: ${confirmedBookings.docs.length}/${eventDoc.capacity}`);

      // If there's space, promote the first waitlisted booking
      if (confirmedBookings.docs.length < eventDoc.capacity) {
        // Find oldest waitlisted booking using FIFO ordering
        const waitlistedBookings = await payload.find({
          collection: 'bookings',
          where: {
            and: [
              { event: { equals: doc.event } },
              { status: { equals: 'waitlisted' } },
              { tenant: { equals: tenantId } },
            ],
          },
          sort: 'createdAt', // Promote in FIFO order - this ensures fairness
          limit: 1,
        });

        console.log(` Waitlisted bookings found: ${waitlistedBookings.docs.length}`);

        if (waitlistedBookings.docs.length > 0) {
          const bookingToPromote = waitlistedBookings.docs[0] as Booking;
          const promotedUserId: any = typeof bookingToPromote.user === 'object' ? bookingToPromote.user.id : bookingToPromote.user;
          
          console.log(` Promoting booking ${bookingToPromote.id} for user ${promotedUserId}`);
          
          // Update the booking status to confirmed
          await payload.update({
            collection: 'bookings',
            id: bookingToPromote.id,
            data: {
              status: 'confirmed',
            },
            context: { skipHooks: true, isPromotion: true }, // Mark as promotion and skip hooks to prevent loops
          });

          // Create notification and log for the promoted booking
          await createNotification(
            promotedUserId, 
            'waitlist_promoted', 
            'Promoted from Waitlist', 
            'Great news! A spot opened up and your booking is now confirmed!'
          );
          
          await createBookingLog('promote_from_waitlist', 'Promoted from waitlist due to cancellation.');
          
          console.log(` Successfully promoted booking ${bookingToPromote.id} from waitlist`);
        } else {
          console.log(` No waitlisted bookings to promote`);
        }
      } else {
        console.log(` Event is still at full capacity, no promotion needed`);
      }
    } catch (error) {
      payload.logger.error(`Error promoting from waitlist: ${error}`);
      console.error(`❌ Promotion error:`, error);
    }
  };

  // Handle new booking creation - create initial logs and notifications
  if (operation === 'create') {
    console.log(`New booking created: ${doc.id} with status: ${doc.status}`);
    
    // Use setTimeout to ensure booking is fully committed to DB first
    // This prevents race conditions where we try to reference a booking that's not yet saved
    setTimeout(async () => {
      await createBookingLog('create_request', 'User requested a booking.');

      if (doc.status === 'confirmed') {
        await createNotification(userId, 'booking_confirmed', 'Booking Confirmed', 'Your booking has been confirmed as space was available.');
        await createBookingLog('auto_confirm', 'Automatically confirmed.');
      } else if (doc.status === 'waitlisted') {
        await createNotification(userId, 'waitlisted', 'Added to Waitlist', 'The event is full; you\'ve been added to the waitlist.');
        await createBookingLog('auto_waitlist', 'Automatically waitlisted.');
      }
    }, 300);
  }

  // Handle booking status changes (confirmed → canceled, waitlisted → confirmed, etc.)
  if (operation === 'update' && doc.status !== previousDoc?.status) {
    console.log(`Booking status changed: ${previousDoc?.status} → ${doc.status}`);
    
    // Again using setTimeout to ensure proper sequencing of database operations
    setTimeout(async () => {
      if (doc.status === 'confirmed' && previousDoc?.status === 'waitlisted') {
        // Check if this was an automatic promotion vs manual confirmation
        if (context?.isPromotion) {
          await createNotification(userId, 'waitlist_promoted', 'Promoted from Waitlist', 'A spot opened up; your booking is now confirmed.');
          await createBookingLog('promote_from_waitlist', 'Promoted from waitlist due to cancellation.');
        } else {
          await createNotification(userId, 'booking_confirmed', 'Booking Confirmed', 'Your booking status has been updated to confirmed.');
          await createBookingLog('auto_confirm', 'Status updated to confirmed.');
        }
      } else if (doc.status === 'canceled' && (previousDoc?.status === 'confirmed' || previousDoc?.status === 'waitlisted')) {
        await createNotification(userId, 'booking_canceled', 'Booking Canceled', 'Your booking has been canceled.');
        await createBookingLog('cancel_confirmed', `${previousDoc?.status || 'Unknown'} booking canceled.`);
        
        // If a confirmed booking was canceled, try to promote someone from waitlist
        // This is where the magic happens - automatic waitlist management
        if (previousDoc?.status === 'confirmed') {
          console.log(`Confirmed booking canceled, checking for waitlist promotion...`);
          
          // Use a longer timeout to ensure the cancellation is fully processed
          setTimeout(() => {
            promoteFromWaitlist();
          }, 500);
        }
      }
    }, 300);
  }

  return doc;
};