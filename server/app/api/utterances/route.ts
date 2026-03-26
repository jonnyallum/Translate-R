// server/app/api/utterances/route.ts
import { NextRequest } from 'next/server';
import { createUtterance, listUtterances } from '../../../src/routes/utterances';

export async function POST(req: NextRequest) {
  return createUtterance(req);
}

export async function GET(req: NextRequest) {
  return listUtterances(req);
}
