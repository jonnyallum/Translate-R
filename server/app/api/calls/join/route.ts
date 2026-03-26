// server/app/api/calls/join/route.ts
import { NextRequest } from 'next/server';
import { joinCall } from '../../../../src/routes/calls';

export async function POST(req: NextRequest) {
  return joinCall(req);
}
