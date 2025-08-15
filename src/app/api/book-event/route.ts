// src/app/api/book-event/route.ts
import { getPayload } from 'payload';
import config from '@/payload.config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'attendee') return NextResponse.json({ error: 'Only attendees can book events' }, { status: 403 });

    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });

    const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;

    // Check event
    const event = await payload.findByID({ collection: 'events', id: eventId });
    if (!event || (typeof event.tenant === 'object' ? event.tenant.id : event.tenant) !== tenantId) {
      return NextResponse.json({ error: 'Event not found in your tenant' }, { status: 404 });
    }

    // Count confirmed bookings
    const confirmedBookings = await payload.count({
      collection: 'bookings',
      where: { and: [{ event: { equals: eventId } }, { status: { equals: 'confirmed' } }, { tenant: { equals: tenantId } }] }
    });

    const status = confirmedBookings.totalDocs < event.capacity ? 'confirmed' : 'waitlisted';

    // Create booking
    const booking = await payload.create({
      collection: 'bookings',
      data: { event: eventId, user: user.id, tenant: tenantId, status }
    });

    // Log
    await payload.create({
      collection: 'booking-logs',
      data: {
        booking: booking.id,
        event: eventId,
        user: user.id,
        action: status === 'confirmed' ? 'auto_confirm' : 'auto_waitlist',
        tenant: tenantId
      }
    });

    // Notify
    await payload.create({
      collection: 'notifications',
      data: {
        user: user.id,
        booking: booking.id,
        type: status === 'confirmed' ? 'booking_confirmed' : 'waitlisted',
        title: `Your booking is ${status}`,
        message: `You have been ${status} for ${event.title}`,
        tenant: tenantId
      }
    });

    return NextResponse.json({ booking });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to book event' }, { status: 500 });
  }
}
