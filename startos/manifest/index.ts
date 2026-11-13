import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'easyappointments',
  title: 'Easy!Appointments',
  license: 'GPL-3.0',
  packageRepo: 'https://github.com/Start9Labs/easyappointments-startos',
  upstreamRepo: 'https://github.com/alextselegidis/easyappointments',
  marketingUrl: 'https://easyappointments.org',
  donationUrl: null,
  description: { short, long },
  volumes: ['startos', 'mysql', 'storage'],
  images: {
    app: {
      source: {
        dockerTag: 'alextselegidis/easyappointments:1.6.1-php2shell-fix',
      },
      arch: ['x86_64', 'aarch64'],
    },
    mysql: {
      source: { dockerTag: 'mysql:8.4.13' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
