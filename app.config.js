// SDK 54: web is Metro-only (webpack support was removed in SDK 50).
const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  web: {
    ...appJson.expo.web,
    bundler: 'metro',
  },
  extra: {
    ...appJson.expo.extra,
    // Set GOOGLE_MAPS_API_KEY as an EAS secret for production builds
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  },
};
