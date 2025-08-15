// src/app/api/my-notifications/route.ts
import { getPayload } from 'payload';
import config from '@/payload.config';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;

    const notifications = await payload.find({
      collection: 'notifications',
      where: { and: [{ user: { equals: user.id } }, { read: { equals: false } }, { tenant: { equals: tenantId } }] },
      sort: '-createdAt'
    });

    return NextResponse.json(notifications.docs);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
