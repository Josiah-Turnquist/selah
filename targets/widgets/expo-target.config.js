/**
 * Selah's home-screen widgets (Pray + Memorize). The app writes a snapshot
 * into the shared App Group (see src/lib/widgets/) and these render it.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'widget',
  name: 'Selah Widgets',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.josiahturnq.selah'],
  },
};
