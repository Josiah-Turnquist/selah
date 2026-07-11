/**
 * Selah's home-screen widgets (Pray + Memorize). The app writes a snapshot
 * into the shared App Group (see src/lib/widgets/) and these render it.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'widget',
  // No space: EAS keys the target by productName ("SelahWidgets") and then
  // looks the target up by that exact name in project.pbxproj — a display
  // name with a space breaks profile assignment at build time.
  name: 'SelahWidgets',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.josiahturnq.selah'],
  },
};
