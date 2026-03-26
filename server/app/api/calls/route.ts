// server/app/api/calls/route.ts
import { NextRequest } from 'next/server';
import { createCall } from '../../../src/routes/calls';

export async function POST(req: NextRequest) {
  return createCall(req);
}
