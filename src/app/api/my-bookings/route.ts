// src/app/api/my-bookings/route.ts
import { getPayload } from 'payload';
import config from '@/payload.config';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant;

    const bookings = await payload.find({
      collection: 'bookings',
      where: { and: [{ user: { equals: user.id } }, { tenant: { equals: tenantId } }] },
      depth: 2,
      sort: '-createdAt'
    });

    return NextResponse.json(bookings.docs);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
