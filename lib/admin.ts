export const DEFAULT_ADMIN_USER_ID = "58d4c980-33e7-4b83-a531-1a41671e9e7b";

export function getAdminUserId(): string {
  return process.env.ADMIN_USER_ID ?? DEFAULT_ADMIN_USER_ID;
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return userId === getAdminUserId();
}
