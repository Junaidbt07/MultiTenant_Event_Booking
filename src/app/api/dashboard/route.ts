// src/app/api/dashboard/organizer/route.ts
import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from headers (same way as in your page.tsx)
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an organizer
    if (user.role !== 'organizer') {
      return NextResponse.json({ error: 'Access denied. Only organizers can access this dashboard.' }, { status: 403 })
    }

    const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant

    // Get all events for this organizer
    const eventsResult = await payload.find({
      collection: 'events',
      where: {
        and: [
          { organizer: { equals: user.id } },
          { tenant: { equals: tenantId } }
        ]
      },
      limit: 100,
      sort: 'date'
    })

    const events = eventsResult.docs

    // For each event, get booking counts
    const eventDetails = await Promise.all(
      events.map(async (event) => {
        const bookingsResult = await payload.find({
          collection: 'bookings',
          where: {
            and: [
              { event: { equals: event.id } },
              { tenant: { equals: tenantId } }
            ]
          },
          limit: 1000
        })

        const bookings = bookingsResult.docs
        
        const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
        const waitlistedCount = bookings.filter(b => b.status === 'waitlisted').length
        const canceledCount = bookings.filter(b => b.status === 'canceled').length
        const percentageFilled = event.capacity > 0 ? Math.round((confirmedCount / event.capacity) * 100) : 0

        return {
          id: event.id,
          title: event.title,
          date: event.date,
          capacity: event.capacity,
          confirmedCount,
          waitlistedCount,
          canceledCount,
          percentageFilled
        }
      })
    )

    // Calculate summary analytics
    const totalEvents = events.length
    const totalConfirmedBookings = eventDetails.reduce((sum, event) => sum + event.confirmedCount, 0)
    const totalWaitlistedBookings = eventDetails.reduce((sum, event) => sum + event.waitlistedCount, 0)
    const totalCanceledBookings = eventDetails.reduce((sum, event) => sum + event.canceledCount, 0)

    // Filter for upcoming events (future dates)
    const now = new Date()
    const upcomingEvents = eventDetails.filter(event => new Date(event.date) > now)

    const dashboardData = {
      upcomingEvents,
      summaryAnalytics: {
        totalEvents,
        totalConfirmedBookings,
        totalWaitlistedBookings,
        totalCanceledBookings
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}