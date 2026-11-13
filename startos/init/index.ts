import { sdk } from '../sdk'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { i18n } from '../i18n'
import { primaryUrl } from '../primaryUrl'
import { seedFiles } from './seedFiles'
import { installApp } from './installApp'
import { watchAdminPassword } from './watchAdminPassword'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  installApp,
  setInterfaces,
  actions,
  primaryUrl.setupTask('important', {
    reason: i18n(
      'Choose the address that links in emails to customers and staff should use',
    ),
  }),
  watchAdminPassword,
  dependencies,
)

export const uninit = sdk.setupUninit(versionGraph)
