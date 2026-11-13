<p align="center">
  <img src="icon.png" alt="Easy!Appointments Logo" width="21%">
</p>

# Easy!Appointments on StartOS

> Everything not listed in this document should behave the same as upstream Easy!Appointments.
> If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section of
> `instructions.md` for links.

[Easy!Appointments](https://github.com/alextselegidis/easyappointments) is a self-hosted appointment booking site for a business with several staff: a public booking page plus a backend calendar with admin, provider and secretary roles.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs upstream's own image unmodified next to the official MySQL image, both for x86_64 and aarch64. The upstream image's entrypoint is **not** used: it would append a fixed `base_url` to `application/config/config.php`, pinning every page to one address. The package writes the config files itself (see [File Models](#file-models)) and runs `apache2-foreground` directly.

| Subcontainer | Image                             | Runs                                                                                                |
| ------------ | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `mysql`      | `mysql`                           | MySQL, bound to `127.0.0.1`, X Protocol off                                                         |
| `app`        | `alextselegidis/easyappointments` | Apache + PHP (as root, dropping to `www-data`); the oneshots and the scheduler loop (as `www-data`) |

Inside `app`, before Apache starts, three oneshots run in order on every start: `chown` (creates the `storage/` subdirectories and gives them to `www-data`), `migrate` (`php index.php console migrate`, upstream's schema upgrade), and `admin-password` (see [Installation and First-Run Flow](#installation-and-first-run-flow)).

The `scheduler` daemon runs `php index.php console sync` (Google Calendar and CalDAV, for every provider that has sync turned on) every 15 minutes, and `php index.php console cleanup` (customer data retention, a no-op unless set in **Settings**) once a day. Its output goes to the service log.

Xdebug, which the upstream image ships enabled in debug mode, is turned off.

## Volume and Data Layout

Three volumes. All appointment data lives in MySQL.

| Volume    | Mount point                     | Contents                                                                                                                |
| --------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `mysql`   | `/var/lib/mysql` (`mysql`)      | The `easyappointments` database                                                                                         |
| `storage` | `/var/www/html/storage` (`app`) | Upstream's `storage/`: file sessions, logs, cache, the unused `uploads/` and `backups/`, plus `.startos-admin-password` |
| `startos` | not mounted in a subcontainer   | `store.json`                                                                                                            |

Apache refuses all requests for `storage/`. It sits under the document root, and upstream's image would otherwise serve its files raw.

## File Models

The package keeps one file model and generates three files into the `app` container's root filesystem on every start. A hand edit to any generated file is lost at the next start.

**`store.json`** (`startos` volume, JSON) holds:

- `dbPassword`: generated at install, and the MySQL root password from then on.
- `adminPassword`: written by **Set Admin Password**.
- `primaryUrl`: written by **Set Primary URL**.
- `smtp`: written by **Configure SMTP**.

Generated on every start:

| File                                         | From                                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/var/www/html/config.php`                   | `BASE_URL` (the primary URL, or the best available address when none is chosen), the database credentials, `LANGUAGE = english`, `DEBUG_MODE = false` |
| `/var/www/html/application/config/email.php` | `smtp`. When it is disabled, the protocol is PHP `mail`, which fails because the image has no sendmail                                                |
| `/usr/local/etc/php/conf.d/zz-startos.ini`   | `xdebug.mode = off`                                                                                                                                   |
| `/etc/apache2/conf-enabled/zz-startos.conf`  | `ServerName`, and the deny for `storage/`                                                                                                             |

`BASE_URL` is used only for links in outgoing email (`trusted_site_url`). Pages are served at whatever address the browser used. Changing the primary URL or SMTP restarts the service.

Apache gets `PROXY_IPS` from the environment, set to the StartOS bridge subnet. That makes Easy!Appointments read the client address from `X-Forwarded-For`, so its per-IP rate limit and login lockout apply to each visitor rather than to the proxy. Every other setting (company, working plans, booking rules, integrations, LDAP, webhooks, API) lives in the database and is set in the web UI.

## Dependencies

None.

## Network Access and Interfaces

Two interfaces on one port (host `ui`). They are the same Apache server opened at different paths, so they share addresses, and a domain added to the host serves both.

| Interface | Type | Port | Protocol | Path               | Purpose                                                                                                                                                              |
| --------- | ---- | ---- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `booking` | `ui` | 80   | HTTP     | `/`                | The public booking page. `?service=<id>` and `?provider=<id>` pre-select a service and provider; Admin's **Booking Link** icons build these from the current address |
| `admin`   | `ui` | 80   | HTTP     | `/index.php/login` | The staff backend. The REST API is on the same port at `/index.php/api/v1`                                                                                           |

The primary URL is chosen from the `booking` interface's addresses.

MySQL is not exposed. Google Calendar sync needs the host on a public HTTPS domain, because Google's OAuth redirect URI must be one.

## Installation and First-Run Flow

The upstream web installer is never reachable, because the package installs the application during init.

1. **On install,** init starts a temporary MySQL and runs `php index.php console install`. That creates the schema and upstream's seed data: an `administrator` account whose password is `administrator`, a provider "Jane Doe", a customer "James Doe", a service "Service", and placeholder company settings. These are the same records the web installer would create.
2. **Before the first start,** a critical task blocks the service until **Set Admin Password** has stored a password, so the seeded `administrator` password never goes live.
3. **On every start,** the `admin-password` oneshot compares the stored password with a SHA-256 digest in `storage/.startos-admin-password`.
   - When they differ, or the digest file is missing, it bcrypts the stored password into the lowest-id admin account and rewrites the digest.
   - When they match, it does nothing, so a password changed in the app's own account settings is kept.
   - After a restore the digest file is gone (`storage` is not backed up), so the stored password is applied again.

## Actions

Three actions, each safe to repeat, none taking more than a restart.

- **Set Admin Password** — mints a new 24-character password, stores it, and returns it with the username `administrator`. When the service is running, it restarts so the `admin-password` oneshot applies the password. When stopped, the password applies at the next start. It targets the lowest-id admin account even if that account was renamed in the UI, so the username it shows is wrong after a rename.
- **Set Primary URL** — chooses the address put into emailed links (confirmations, reschedule and cancel links, password resets). Rewrites `config.php` and restarts. Run it when customers receive links they cannot open.
- **Configure SMTP** — off, StartOS system SMTP, or a custom server. Rewrites `email.php` and restarts. With SMTP off, bookings still succeed, but no notification is sent (the log shows `/usr/sbin/sendmail: not found`).

## Tasks

Two tasks. Only the first blocks startup.

| Task                       | Severity  | Raised when                                                                          | Cleared by                                                          |
| -------------------------- | --------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Run **Set Admin Password** | critical  | `store.json` has no `adminPassword` (a fresh install)                                | Running the action. It does not return                              |
| Run **Set Primary URL**    | important | No primary URL is chosen, or the chosen one is no longer an address of the interface | Choosing an address that exists; returns if that address is removed |

## Health Checks

Only the web interface is shown. MySQL and the scheduler have internal checks only.

- **Web Interface** — `GET http://127.0.0.1/index.php/login` returns 2xx. It stays pending while MySQL starts and the three oneshots run, usually under 15 seconds. A failure after that is almost always one of three things:
  - a oneshot that exited non-zero: `migrate` (a schema error) or `admin-password` (`No admin account found` means there is no admin-role user left in the database);
  - MySQL refusing the `root` login over TCP;
  - a PHP error. Look in the service log, and in `storage/logs/log-<date>.php` inside the `app` subcontainer.

## Backups and Restore

The `mysql` and `startos` volumes are copied whole. StartOS stops the service before a backup, so nothing writes during the copy. If that stop ended in a forced kill, InnoDB recovers on the next start, as after a power loss. A restore brings back the database's accounts and settings as they were.

`storage` is deliberately excluded: it holds only sessions, logs and cache, so everyone is signed out after a restore. The stored administrator password is applied again at the next start.

## Limitations and Differences

1. The web installer (`/index.php/installation`) is never offered. Install creates upstream's sample records, which you rename or delete.
2. Email links use the primary URL, never the address the request came in on.
3. The upstream Docker image's environment variables (`BASE_URL`, `DB_*`, `MAIL_*`, `GOOGLE_*`) have no effect. The package writes the config files. Google Calendar credentials are entered in the web UI.
4. The interface language default is fixed to English. Each user and customer can still choose their own.
5. Xdebug is disabled.
6. Payments, SMS and reminders, which are upstream's paid hosted services, are not included.

---

## Quick Reference for AI Consumers

```yaml
package_id: easyappointments
image: alextselegidis/easyappointments
architectures: [x86_64, aarch64]
subcontainers: [mysql, app]
volumes:
  mysql: /var/lib/mysql
  storage: /var/www/html/storage
  startos: (store.json, not mounted)
file_models:
  - store.json
startos_managed_env_vars:
  - PROXY_IPS
  - MYSQL_ROOT_PASSWORD
  - MYSQL_DATABASE
dependencies: none
interfaces:
  booking: { type: ui, port: 80 }
  admin: { type: ui, port: 80 }
actions:
  - set-admin-password
  - set-primary-url
  - manage-smtp
tasks:
  - { action: set-admin-password, severity: critical }
  - { action: set-primary-url, severity: important }
health_checks:
  - apache
```
