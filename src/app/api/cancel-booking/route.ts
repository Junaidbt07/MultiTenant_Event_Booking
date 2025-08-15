// src/app/api/cancel-booking/route.ts
import { getPayload } from 'payload';
import config from '@/payload.config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

    const booking = await payload.findByID({ collection: 'bookings', id: bookingId });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const tenantId = typeof booking.tenant === 'object' ? booking.tenant.id : booking.tenant;

    if (
      user.role === 'attendee' &&
      (typeof booking.user === 'object' ? booking.user.id : booking.user) !== user.id
    ) {
      return NextResponse.json({ error: 'You can only cancel your own bookings' }, { status: 403 });
    }

    // Cancel booking
    const updatedBooking = await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { status: 'canceled' }
    });

    // Log
    await payload.create({
      collection: 'booking-logs',
      data: {
        booking: bookingId,
        event: booking.event,
        user: user.id,
        action: 'cancel_confirmed',
        tenant: tenantId
      }
    });

    // Notify
    await payload.create({
      collection: 'notifications',
      data: {
        user: typeof booking.user === 'object' ? booking.user.id : booking.user,
        booking: bookingId,
        type: 'booking_canceled',
        title: 'Booking Canceled',
        message: 'Your booking has been canceled',
        tenant: tenantId
      }
    });

    // Promote waitlist if possible
    const eventId = typeof booking.event === 'object' ? booking.event.id : booking.event;

    const event = await payload.findByID({
      collection: 'events',
      id: eventId
    });

    const confirmedCount = await payload.count({
      collection: 'bookings',
      where: { and: [{ event: { equals: booking.event } }, { status: { equals: 'confirmed' } }, { tenant: { equals: tenantId } }] }
    });

    if (confirmedCount.totalDocs < event.capacity) {
      const waitlisted = await payload.find({
        collection: 'bookings',
        where: { and: [{ event: { equals: booking.event } }, { status: { equals: 'waitlisted' } }, { tenant: { equals: tenantId } }] },
        sort: 'createdAt',
        limit: 1
      });

      if (waitlisted.docs.length > 0) {
        const promoted = waitlisted.docs[0];
        await payload.update({ collection: 'bookings', id: promoted.id, data: { status: 'confirmed' } });

        await payload.create({
          collection: 'notifications',
          data: {
            user: typeof promoted.user === 'object' ? promoted.user.id : promoted.user,
            booking: promoted.id,
            type: 'waitlist_promoted',
            title: 'Booking Promoted',
            message: 'You have been promoted from the waitlist to confirmed.',
            tenant: tenantId
          }
        });
      }
    }

    return NextResponse.json({ booking: updatedBooking });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
