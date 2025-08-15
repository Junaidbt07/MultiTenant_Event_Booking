// src/app/hooks/booking.ts
import { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload';
import { Event, User, Booking } from '@/payload-types';

type BookingAction = 'create_request' | 'auto_waitlist' | 'auto_confirm' | 'promote_from_waitlist' | 'cancel_confirmed';
type NotificationType = 'booking_confirmed' | 'waitlisted' | 'waitlist_promoted' | 'booking_canceled';

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
    const eventDoc = await payload.findByID({
      collection: 'events',
      id: eventId,
    }) as Event;

    if (!eventDoc) throw new Error('Event not found.');

    const user = req.user as User | null;
    const tenantId = user
      ? typeof user.tenant === 'object' ? user.tenant.id : user.tenant
      : data.tenant;

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

    data.status = confirmedBookings.docs.length < eventDoc.capacity
      ? 'confirmed'
      : 'waitlisted';

  } catch (error) {
    payload.logger.error(`Error checking event capacity: ${error}`);
  }

  return data;
};

export const handleBookingStatusChange: CollectionAfterChangeHook = async ({ req, doc, previousDoc, operation, context }) => {
  const { payload } = req;

  // Skip hook if explicitly requested
  if (context?.skipHooks) return doc;

  // Guard: Ensure we have required IDs
  if (!doc?.id || !doc?.event || !doc?.user || !doc?.tenant) {
    payload.logger.error(`Missing required IDs for booking ${doc?.id || '(no id)'}`);
    return doc;
  }

  const tenantId = typeof doc.tenant === 'object' ? doc.tenant.id : doc.tenant;
  const userId = typeof doc.user === 'object' ? doc.user.id : doc.user;

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
      console.log(`✅ Notification created: ${type} for user ${userId}`);
    } catch (error) {
      payload.logger.error(`Failed to create notification: ${error}`);
      console.error(`❌ Notification error:`, error);
    }
  };

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
      console.log(`✅ Booking log created: ${action}`);
    } catch (error) {
      payload.logger.error(`Failed to create booking log: ${error}`);
    }
  };

  const promoteFromWaitlist = async () => {
    try {
      console.log(`🔄 Starting waitlist promotion for event ${doc.event}`);
      
      // Get the event to check capacity
      const eventDoc = await payload.findByID({
        collection: 'events',
        id: doc.event,
      }) as Event;

      if (!eventDoc) {
        console.log('❌ Event not found for promotion');
        return;
      }

      // Get current confirmed bookings count
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

      console.log(`📊 Current confirmed bookings: ${confirmedBookings.docs.length}/${eventDoc.capacity}`);

      // If there's space, promote the first waitlisted booking
      if (confirmedBookings.docs.length < eventDoc.capacity) {
        const waitlistedBookings = await payload.find({
          collection: 'bookings',
          where: {
            and: [
              { event: { equals: doc.event } },
              { status: { equals: 'waitlisted' } },
              { tenant: { equals: tenantId } },
            ],
          },
          sort: 'createdAt', // Promote in FIFO order
          limit: 1,
        });

        console.log(`📋 Waitlisted bookings found: ${waitlistedBookings.docs.length}`);

        if (waitlistedBookings.docs.length > 0) {
          const bookingToPromote = waitlistedBookings.docs[0] as Booking;
          const promotedUserId: any = typeof bookingToPromote.user === 'object' ? bookingToPromote.user.id : bookingToPromote.user;
          
          console.log(`🎉 Promoting booking ${bookingToPromote.id} for user ${promotedUserId}`);
          
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
          
          console.log(`✅ Successfully promoted booking ${bookingToPromote.id} from waitlist`);
        } else {
          console.log(`ℹ️ No waitlisted bookings to promote`);
        }
      } else {
        console.log(`ℹ️ Event is still at full capacity, no promotion needed`);
      }
    } catch (error) {
      payload.logger.error(`Error promoting from waitlist: ${error}`);
      console.error(`❌ Promotion error:`, error);
    }
  };

  if (operation === 'create') {
    // Handle new booking creation
    console.log(`📝 New booking created: ${doc.id} with status: ${doc.status}`);
    
    // Use setTimeout to ensure booking is fully committed to DB first
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

  if (operation === 'update' && doc.status !== previousDoc?.status) {
    console.log(`🔄 Booking status changed: ${previousDoc?.status} → ${doc.status}`);
    
    setTimeout(async () => {
      if (doc.status === 'confirmed' && previousDoc?.status === 'waitlisted') {
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
        if (previousDoc?.status === 'confirmed') {
          console.log(`🔄 Confirmed booking canceled, checking for waitlist promotion...`);
          
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