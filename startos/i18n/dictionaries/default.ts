export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Easy!Appointments!': 0,
  'store.json not found': 1,
  'Web Interface': 2,
  'The web interface is ready': 3,
  'The web interface is not ready': 4,

  // interfaces.ts
  'Booking Page': 5,
  'The public page where customers book appointments': 6,
  Admin: 21,
  'The staff backend for managing appointments, users and settings': 22,

  // primaryUrl.ts
  'Set Primary URL': 7,
  'Choose the address Easy!Appointments puts in the links it emails to customers and staff, such as appointment changes and password resets.': 8,
  URL: 9,

  // init/index.ts
  'Choose the address that links in emails to customers and staff should use': 10,

  // init/watchAdminPassword.ts
  'Set the administrator password before signing in': 11,

  // actions/setAdminPassword.ts
  'Set Admin Password': 12,
  'Generate a new random password for the administrator account. If the service is running, it restarts to apply it.': 13,
  'Replaces the current administrator password.': 14,
  'Administrator Credentials': 15,
  'Sign in on the Admin interface with these credentials. The password takes effect once the service has started.': 16,
  Username: 17,
  Password: 18,

  // actions/manageSmtp.ts
  'Configure SMTP': 19,
  'Set the mail server Easy!Appointments uses for booking confirmations, notifications and password resets.': 20,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
