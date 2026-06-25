const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Selah uses only *local* notifications (the daily reading reminder), which do
 * not require the Push Notifications capability. expo-notifications adds an
 * `aps-environment` entitlement by default; strip it so the App Store
 * provisioning profile (which has no push capability) signs cleanly.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
