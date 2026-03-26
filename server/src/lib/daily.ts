// server/src/lib/daily.ts
// Daily.co API client for managing video call rooms

const DAILY_API_URL = 'https://api.daily.co/v1';

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config: Record<string, unknown>;
}

interface DailyMeetingToken {
  token: string;
}

/**
 * Create a new Daily.co room for a 1-to-1 call.
 */
export async function createDailyRoom(roomName: string): Promise<DailyRoom> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error('DAILY_API_KEY is required');

  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: {
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        enable_recording: 'none',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        eject_at_room_exp: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Daily room: ${error}`);
  }

  return response.json();
}

/**
 * Generate a meeting token for a specific participant.
 * Tokens are scoped to a room and have limited lifetime.
 */
export async function createDailyToken(
  roomName: string,
  userId: string,
  userName: string
): Promise<string> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error('DAILY_API_KEY is required');

  const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        user_name: userName,
        exp: Math.floor(Date.now() / 1000) + 3600,
        is_owner: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Daily token: ${error}`);
  }

  const data: DailyMeetingToken = await response.json();
  return data.token;
}

/**
 * Delete a Daily.co room (cleanup after call ends).
 */
export async function deleteDailyRoom(roomName: string): Promise<void> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error('DAILY_API_KEY is required');

  await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
