const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];

  if (googleMapsApiKey) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ]);
  }

  return {
    ...config,
    android: {
      ...(config.android ?? {}),
      googleServicesFile:
        googleServicesJson ??
        config.android?.googleServicesFile ??
        './google-services.json',
    },
    plugins,
  };
};