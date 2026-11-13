import { T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import {
  APP_DIR,
  PROXY_IPS,
  appSubcontainer,
  applyAdminPasswordPhp,
  chownStorage,
  configPhp,
  emailPhp,
  mysqlDaemon,
  mysqlSubcontainer,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Easy!Appointments!'))

  const store = await storeJson.read().const(effects)
  if (!store) throw new Error(i18n('store.json not found'))
  const { dbPassword, adminPassword, smtp } = store

  const url =
    (await primaryUrl.bestUsable(effects).const()) ?? `http://localhost`

  let smtpCredentials: T.SmtpValue | null = null
  if (smtp.selection === 'system') {
    smtpCredentials = await sdk.getSystemSmtp(effects).const()
    const customFrom = smtp.value.customFrom as string | undefined
    if (smtpCredentials && customFrom) smtpCredentials.from = customFrom
  } else if (smtp.selection === 'custom') {
    const { host, from, username, password, security } =
      smtp.value.provider.value
    smtpCredentials = {
      host,
      from,
      username,
      password,
      port: Number(security.value.port),
      security: security.selection,
    }
  }

  const appSub = await appSubcontainer(effects, 'app', {
    config: configPhp(url, dbPassword),
    email: emailPhp(smtpCredentials),
  })
  const console_ = (command: string): [string, ...string[]] => [
    'sh',
    '-c',
    `cd ${APP_DIR} && php index.php console ${command}`,
  ]

  return sdk.Daemons.of(effects)
    .addDaemon(
      'mysql',
      mysqlDaemon(mysqlSubcontainer(effects, 'mysql'), dbPassword),
    )
    .addOneshot('chown', {
      subcontainer: appSub,
      exec: { command: chownStorage, user: 'root' },
      requires: [],
    })
    .addOneshot('migrate', {
      subcontainer: appSub,
      exec: { command: console_('migrate'), user: 'www-data' },
      requires: ['mysql', 'chown'],
    })
    .addOneshot('admin-password', {
      subcontainer: appSub,
      exec: {
        command: ['php', '-r', applyAdminPasswordPhp],
        env: { DB_PASSWORD: dbPassword, ADMIN_PASSWORD: adminPassword ?? '' },
        user: 'root',
      },
      requires: ['migrate'],
    })
    .addDaemon('apache', {
      subcontainer: appSub,
      exec: {
        command: ['apache2-foreground'],
        env: { PROXY_IPS },
        user: 'root',
      },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.checkWebUrl(
            effects,
            `http://127.0.0.1:${uiPort}/index.php/login`,
            {
              successMessage: i18n('The web interface is ready'),
              errorMessage: i18n('The web interface is not ready'),
            },
          ),
      },
      requires: ['admin-password'],
    })
    .addDaemon('scheduler', {
      subcontainer: appSub,
      exec: {
        command: [
          'sh',
          '-c',
          `cd ${APP_DIR} && i=0; while :; do php index.php console sync; [ $((i % 96)) -eq 0 ] && php index.php console cleanup; i=$((i + 1)); sleep 900; done`,
        ],
        user: 'www-data',
      },
      ready: {
        display: null,
        fn: () => ({ result: 'success', message: null }),
      },
      requires: ['admin-password'],
    })
})
