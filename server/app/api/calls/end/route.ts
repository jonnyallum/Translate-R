// server/app/api/calls/end/route.ts
import { NextRequest } from 'next/server';
import { endCall } from '../../../../src/routes/calls';

export async function POST(req: NextRequest) {
  return endCall(req);
}
