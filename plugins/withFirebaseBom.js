
const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withFirebaseBom(config) {
  config = withProjectBuildGradle(config, (config) => {
    const kotlinPluginDependency = /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]+)?['"]\)/;

    if (!kotlinPluginDependency.test(config.modResults.contents)) {
      throw new Error('Unable to find the Kotlin Gradle plugin dependency in android/build.gradle.');
    }

    config.modResults.contents = config.modResults.contents.replace(
      kotlinPluginDependency,
      "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.0')"
    );
    config.modResults.contents += `

project.ext {
  set('react-native', [versions: [firebase: [bom: '34.19.0']]])
}
`;

    return config;
  });

  return withGradleProperties(config, (config) => {
    const kotlinVersion = config.modResults.find(
      (property) => property.type === 'property' && property.key === 'android.kotlinVersion'
    );

    if (kotlinVersion) {
      kotlinVersion.value = '2.3.0';
    } else {
      config.modResults.push({
        type: 'property',
        key: 'android.kotlinVersion',
        value: '2.3.0',
      });
    }

    return config;
  });
};
