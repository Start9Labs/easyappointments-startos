# Easy!Appointments

## Documentation

- [Easy!Appointments documentation](https://easyappointments.org/documentation/) — the user guide, settings, and the CalDAV, Google Calendar, LDAP, webhook and REST API guides. Skip its installation, Docker and update chapters: StartOS handles those.

## What you get on StartOS

- **Booking Page** — the public page where customers book. Share this one.
- **Admin** — where you and your staff sign in to manage appointments, users and settings.
- A database that is backed up with the rest of your server.
- Calendar sync with CalDAV and Google Calendar runs every 15 minutes without any setup on your part, once a provider has connected a calendar.

## Getting set up

1. Run **Set Admin Password**. Copy the username (`administrator`) and password it shows you, then start the service.
2. Run **Set Primary URL** and choose the address customers will use. Easy!Appointments puts it in every link it emails — confirmations, reschedule and cancel links, password resets — so pick one your customers can reach, such as a public domain.
3. Run **Configure SMTP** so Easy!Appointments can send those emails. Until you do, bookings still work, but nobody is notified.
4. Open **Admin** and sign in.
5. The install comes with sample records: a provider "Jane Doe", a customer "James Doe", a service called "Service", and placeholder company details. Under **Settings**, set your company name, email and working hours. Then rename or replace the sample provider and service, and delete the sample customer.
6. Under **Users**, give your account a real name and email address, and add your providers and secretaries.

## Using Easy!Appointments

### Actions

- **Set Admin Password** — generates a new password for the administrator account and shows it once. Run it again whenever you need to reset that password, such as when it has been lost. If the service is running, it restarts to apply the password.
- **Set Primary URL** — changes the address used in emailed links.
- **Configure SMTP** — sets the mail server: off, your StartOS server's SMTP settings, or a provider of your own.

### Linking customers to a person or service

The Booking Page lists every service and provider, and customers choose. To send someone straight to one, use the link icon (**Booking Link**) that Admin shows:

- next to a service's name on the **Services** page, for that service;
- next to each provider ticked on a service, for that service with that provider, which opens straight to the calendar;
- next to a provider's name under **Users** → **Providers**, for that provider.

Each link is built from the address you are signed in on, so copy it while you are using the address your customers use. To let customers book with whoever is free, turn on **Display Any Provider Option** under **Settings** → **Booking Settings**.

### Changing the administrator password

You can also change the administrator password in Easy!Appointments under your account settings, and that change is kept. Running **Set Admin Password** replaces it with a new one. Restoring from a backup puts back the password **Set Admin Password** last gave you.

### Calendar sync with a server on your network

Easy!Appointments refuses CalDAV servers on a private network until you allow them. When a provider connects to one, such as a calendar service on this server, the connection dialog offers to allow it.

### Google Calendar sync

Google only accepts a sign-in redirect to a public HTTPS address. Add a public domain to the Booking Page first, then follow the Google Calendar guide in the documentation, using that domain in the redirect URI.
