import { verifyEmailToken } from '../../utils/email-verification';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const token = query.token as string | undefined;

  if (!token) {
    return sendRedirect(event, '/verify-email/error?reason=missing_token');
  }

  const userId = await verifyEmailToken(token);

  if (!userId) {
    return sendRedirect(event, '/verify-email/error?reason=invalid_or_expired');
  }

  return sendRedirect(event, '/verify-email/success');
});
