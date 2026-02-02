import type { ApiError } from '@auction-comparator/shared';
import {
  getSessionCookie,
  deleteSession,
  clearSessionCookie,
  validateSession,
  revokeAllUserApiTokens,
} from '../../utils/auth';

export default defineEventHandler(async (event): Promise<{ success: true } | ApiError> => {
  const sessionId = getSessionCookie(event);

  if (sessionId) {
    // Get the user before deleting the session
    const user = await validateSession(sessionId);

    // Revoke all API tokens for this user (logs out extension too)
    if (user) {
      const revokedCount = await revokeAllUserApiTokens(user.id);
      console.log(`[Logout] Revoked ${revokedCount} API tokens for user ${user.id}`);
    }

    await deleteSession(sessionId);
  }

  clearSessionCookie(event);

  return { success: true };
});
