export default defineNuxtRouteMiddleware(async (to) => {
  const { state, fetchUser } = useAuth();

  // Fetch user if not already initialized
  if (!state.value.initialized) {
    await fetchUser();
  }

  // Redirect to account if already authenticated
  if (state.value.user) {
    // Preserve extension ID if present (for auto-connect)
    const extId = to.query.ext;
    if (extId) {
      return navigateTo(`/account?ext=${extId}`);
    }
    return navigateTo('/account');
  }
});
