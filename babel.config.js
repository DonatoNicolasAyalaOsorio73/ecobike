module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54) auto-injects the Reanimated/Worklets plugin.
    presets: ["babel-preset-expo"],
  };
};
