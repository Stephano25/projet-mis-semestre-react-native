module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [] // Supprimez 'react-native-reanimated/plugin'
  };
};