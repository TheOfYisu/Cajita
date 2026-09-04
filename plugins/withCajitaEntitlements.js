const { withEntitlementsPlist } = require('@expo/config-plugins');

const CONTAINER_ID = 'iCloud.com.cajita.app';

/**
 * Añade los entitlements de iCloud necesarios para el contenedor de ubiquity
 * (iCloud Drive) usado por el módulo `cajita-cloud-sync`:
 *  - com.apple.developer.icloud-container-identifiers
 *  - com.apple.developer.icloud-services (CloudDocuments → archivos en iCloud Drive)
 *  - com.apple.developer.ubiquity-kvstore-identifier
 */
module.exports = function withCajitaEntitlements(config) {
  return withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.icloud-container-identifiers'] = [CONTAINER_ID];
    c.modResults['com.apple.developer.icloud-services'] = ['CloudDocuments'];
    c.modResults['com.apple.developer.ubiquity-kvstore-identifier'] = CONTAINER_ID;
    return c;
  });
};