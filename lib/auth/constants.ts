// Shared by the server session code and middleware (edge). No imports.
export const SESSION_COOKIE = "hnv_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const MIN_PASSWORD_LENGTH = 12;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MINUTES = 15;
