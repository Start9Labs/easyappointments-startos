import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import { adminInterfaceId, bookingInterfaceId, uiHostId, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const origin = await sdk.MultiHost.of(effects, uiHostId).bindPort(uiPort, {
    protocol: 'http',
  })
  const preferredLauncherAddress = await primaryUrl.bestUsable(effects).const()
  const booking = sdk.createInterface(effects, {
    name: i18n('Booking Page'),
    id: bookingInterfaceId,
    description: i18n('The public page where customers book appointments'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
    preferredLauncherAddress,
  })
  const admin = sdk.createInterface(effects, {
    name: i18n('Admin'),
    id: adminInterfaceId,
    description: i18n(
      'The staff backend for managing appointments, users and settings',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '/index.php/login',
    query: {},
    preferredLauncherAddress,
  })
  return [await origin.export([booking, admin])]
})
