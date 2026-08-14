const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Shim react-native-masked-text on web with a plain TextInput wrapper
  config.resolve.alias['react-native-masked-text'] = path.resolve(
    __dirname,
    'src/utils/MaskedTextShim.web.js'
  );

  return config;
};
