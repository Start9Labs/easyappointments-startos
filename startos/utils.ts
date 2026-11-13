import { T } from '@start9labs/start-sdk'
import { sdk } from './sdk'

export const uiPort = 80
export const uiHostId = 'ui'
export const bookingInterfaceId = 'booking'
export const adminInterfaceId = 'admin'

export const MYSQL_DATADIR = '/var/lib/mysql'
export const DB_NAME = 'easyappointments'
export const APP_DIR = '/var/www/html'
export const STORAGE_DIRS = ['backups', 'cache', 'logs', 'sessions', 'uploads']

// The StartOS reverse proxy connects from the LXC bridge and sends X-Forwarded-For.
export const PROXY_IPS = '10.0.3.0/24'

const php = (value: string) =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

export function configPhp(baseUrl: string, dbPassword: string) {
  return `<?php
class Config
{
    const BASE_URL = ${php(baseUrl.replace(/\/+$/, ''))};
    const LANGUAGE = 'english';
    const DEBUG_MODE = false;
    const DB_HOST = '127.0.0.1';
    const DB_NAME = ${php(DB_NAME)};
    const DB_USERNAME = 'root';
    const DB_PASSWORD = ${php(dbPassword)};
}
`
}

export function emailPhp(smtp: T.SmtpValue | null) {
  const lines = smtp
    ? [
        `$config['protocol'] = 'smtp';`,
        `$config['smtp_host'] = ${php(smtp.host)};`,
        `$config['smtp_port'] = ${Number(smtp.port)};`,
        // CodeIgniter: 'tls' issues STARTTLS, 'ssl' is implicit TLS.
        `$config['smtp_crypto'] = ${smtp.security === 'tls' ? "'ssl'" : "'tls'"};`,
        `$config['smtp_auth'] = ${smtp.username ? 'TRUE' : 'FALSE'};`,
        `$config['smtp_user'] = ${php(smtp.username ?? '')};`,
        `$config['smtp_pass'] = ${php(smtp.password ?? '')};`,
        `$config['from_address'] = ${php(smtp.from.match(/<([^>]+)>/)?.[1] ?? smtp.from)};`,
        `$config['from_name'] = ${php(smtp.from.match(/^\s*"?([^"<]*?)"?\s*</)?.[1] ?? '')};`,
      ]
    : [`$config['protocol'] = 'mail';`]
  return `<?php defined('BASEPATH') or exit('No direct script access allowed');

$config['useragent'] = 'Easy!Appointments';
$config['mailtype'] = 'html';
${lines.join('\n')}
$config['crlf'] = "\\r\\n";
$config['newline'] = "\\r\\n";
`
}

export const phpIni = `xdebug.mode = off
`

export const apacheConf = `ServerName localhost
<Directory ${APP_DIR}/storage>
    Require all denied
</Directory>
`

/** The app image with its storage volume mounted and the package-owned config files in place. */
export async function appSubcontainer(
  effects: T.Effects,
  name: string,
  files: { config: string; email: string },
) {
  const sub = sdk.SubContainer.of(
    effects,
    { imageId: 'app' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'storage',
      subpath: null,
      mountpoint: `${APP_DIR}/storage`,
      readonly: false,
    }),
    name,
  )
  await sub.writeFile(`${APP_DIR}/config.php`, files.config)
  await sub.writeFile(`${APP_DIR}/application/config/email.php`, files.email)
  await sub.writeFile('/usr/local/etc/php/conf.d/zz-startos.ini', phpIni)
  await sub.writeFile('/etc/apache2/conf-enabled/zz-startos.conf', apacheConf)
  return sub
}

export function mysqlSubcontainer(effects: T.Effects, name: string) {
  return sdk.SubContainer.of(
    effects,
    { imageId: 'mysql' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'mysql',
      subpath: null,
      mountpoint: MYSQL_DATADIR,
      readonly: false,
    }),
    name,
  )
}

export const chownStorage: [string, ...string[]] = [
  'sh',
  '-c',
  `cd ${APP_DIR}/storage && mkdir -p ${STORAGE_DIRS.join(' ')} && chown -R www-data:www-data .`,
]

export function mysqlDaemon(
  sub: ReturnType<typeof mysqlSubcontainer>,
  password: string,
) {
  return {
    subcontainer: sub,
    exec: {
      command: sdk.useEntrypoint(['--bind-address=127.0.0.1', '--mysqlx=OFF']),
      env: { MYSQL_ROOT_PASSWORD: password, MYSQL_DATABASE: DB_NAME },
    },
    ready: {
      display: null,
      fn: async () => {
        const { exitCode } = await sub.exec(
          ['mysql', '-h', '127.0.0.1', '-u', 'root', '-e', 'SELECT 1'],
          { env: { MYSQL_PWD: password } },
        )
        return exitCode === 0
          ? { result: 'success' as const, message: null }
          : { result: 'starting' as const, message: null }
      },
    },
    requires: [],
  }
}

export const applyAdminPasswordPhp = `
$password = getenv('ADMIN_PASSWORD');
if ($password === false || $password === '') exit(0);
$marker = '${APP_DIR}/storage/.startos-admin-password';
$digest = hash('sha256', $password);
if (@file_get_contents($marker) === $digest) exit(0);
$db = new mysqli('127.0.0.1', 'root', getenv('DB_PASSWORD'), '${DB_NAME}');
$row = $db->query("SELECT u.id FROM ea_users u JOIN ea_roles r ON r.id = u.id_roles WHERE r.slug = 'admin' ORDER BY u.id LIMIT 1")->fetch_row();
if (!$row) { fwrite(STDERR, "No admin account found\\n"); exit(1); }
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
$stmt = $db->prepare('UPDATE ea_user_settings SET password = ? WHERE id_users = ?');
$stmt->bind_param('si', $hash, $row[0]);
$stmt->execute();
if ($stmt->affected_rows !== 1) { fwrite(STDERR, "Admin password not updated\\n"); exit(1); }
file_put_contents($marker, $digest);
echo "Applied the StartOS admin password\\n";
`
