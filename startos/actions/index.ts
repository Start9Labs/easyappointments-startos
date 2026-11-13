import { sdk } from '../sdk'
import { primaryUrl } from '../primaryUrl'
import { manageSmtp } from './manageSmtp'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(primaryUrl.action)
  .addAction(manageSmtp)
