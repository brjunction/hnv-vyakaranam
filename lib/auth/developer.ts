// The site's developer. Hard-coded on purpose: no admin (not even an owner)
// can see, change, turn off or remove this account from the dashboard.
export const DEVELOPER_EMAILS = ["bhism108@gmail.com"];
export const isDeveloperEmail = (email: string | null | undefined) => !!email && DEVELOPER_EMAILS.includes(email.trim().toLowerCase());
