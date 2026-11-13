import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import {
  APP_DIR,
  appSubcontainer,
  chownStorage,
  configPhp,
  emailPhp,
  mysqlDaemon,
  mysqlSubcontainer,
} from '../utils'

export const installApp = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return
  const dbPassword = await storeJson.read((s) => s.dbPassword).once()
  if (!dbPassword) throw new Error('No database password in store.json')

  const appSub = await appSubcontainer(effects, 'install', {
    config: configPhp('http://localhost', dbPassword),
    email: emailPhp(null),
  })

  await sdk.Daemons.of(effects)
    .addDaemon(
      'mysql',
      mysqlDaemon(mysqlSubcontainer(effects, 'install-mysql'), dbPassword),
    )
    .addOneshot('chown', {
      subcontainer: appSub,
      exec: { command: chownStorage, user: 'root' },
      requires: [],
    })
    .addOneshot('install', {
      subcontainer: appSub,
      exec: {
        command: ['sh', '-c', `cd ${APP_DIR} && php index.php console install`],
        user: 'www-data',
      },
      requires: ['mysql', 'chown'],
    })
    .runUntilSuccess(300_000)
})
