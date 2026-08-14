// Dynamic config: use Metro bundler on CI/Vercel (Linux), webpack locally (Windows)
const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  web: {
    ...appJson.expo.web,
    bundler: process.env.CI ? 'metro' : 'webpack',
  },
  extra: {
    ...appJson.expo.extra,
    // Set GOOGLE_MAPS_API_KEY as an EAS secret for production builds
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  },
};
