module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            tslib: './shims/tslib-shim.js',
          },
          extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
        },
      ],
      'expo-router/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
