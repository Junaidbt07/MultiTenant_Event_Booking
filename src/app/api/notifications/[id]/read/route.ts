// src/app/api/notifications/[id]/read/route.ts
import { getPayload } from 'payload';
import config from '@/payload.config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: notificationId } = await params;
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Find the notification
    const notification = await payload.findByID({
      collection: 'notifications',
      id: notificationId
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check access permissions
    const notificationUserId = typeof notification.user === 'object' ? notification.user.id : notification.user;
    const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;
    const notificationTenantId = typeof notification.tenant === 'object' ? notification.tenant.id : notification.tenant;

    // Attendees can only mark their own notifications as read
    if (user.role === 'attendee' && notificationUserId !== user.id) {
      return NextResponse.json({ error: 'You can only mark your own notifications as read' }, { status: 403 });
    }

    // Check tenant isolation
    if (tenantId !== notificationTenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update notification to read
    const updatedNotification = await payload.update({
      collection: 'notifications',
      id: notificationId,
      data: { read: true }
    });

    return NextResponse.json({ 
      success: true,
      notification: updatedNotification 
    });

  } catch (err) {
    console.error('Error marking notification as read:', err);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}