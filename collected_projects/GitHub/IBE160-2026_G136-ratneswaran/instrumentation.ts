export async function register() {
  const { getServerEnv } = await import("@/lib/env");
  getServerEnv();
}
