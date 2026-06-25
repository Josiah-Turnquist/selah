const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * expo-notifications adds the `aps-environment` (remote push) entitlement by
 * default. This app only uses LOCAL notifications (scheduleNotificationAsync —
 * daily reminders), which don't require push. The spurious entitlement forces
 * signing with a Push-enabled provisioning profile, which we don't have.
 *
 * Stripping it lets the build sign with a standard App Store profile. If remote
 * push is ever added, remove this plugin and provision a Push-enabled profile.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
