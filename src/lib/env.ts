function parsePositiveInteger(
  name: string,
  rawValue: string | undefined,
  fallback: number,
) {
  const value = rawValue?.trim() ? Number(rawValue) : fallback;

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number.`);
  }

  return value;
}

function parseBoolean(
  name: string,
  rawValue: string | undefined,
  fallback: boolean,
) {
  if (!rawValue?.trim()) {
    return fallback;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`${name} must be either true or false.`);
}

export function getAppUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3000";
}

export function getAdminSessionCookieName() {
  return (
    process.env.ADMIN_SESSION_COOKIE_NAME?.trim() ||
    "home_charging_admin_session"
  );
}

export function getAdminSessionDays() {
  return parsePositiveInteger(
    "ADMIN_SESSION_DAYS",
    process.env.ADMIN_SESSION_DAYS,
    1,
  );
}

export function getDraftInactivityDays() {
  return parsePositiveInteger(
    "DRAFT_INACTIVITY_DAYS",
    process.env.DRAFT_INACTIVITY_DAYS,
    7,
  );
}

export function shouldAllowDatabaseReset() {
  return parseBoolean(
    "ALLOW_DATABASE_RESET",
    process.env.ALLOW_DATABASE_RESET,
    false,
  );
}
