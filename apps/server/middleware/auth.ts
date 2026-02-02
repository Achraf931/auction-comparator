export default defineNuxtRouteMiddleware(async () => {
  const { state, fetchUser } = useAuth();

  // Fetch user if not already initialized
  if (!state.value.initialized) {
    await fetchUser();
  }

  // Redirect to login if not authenticated
  if (!state.value.user) {
    return navigateTo('/login');
  }
});
