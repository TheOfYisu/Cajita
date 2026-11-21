const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

/**
 * Plugin de Expo para garantizar que Gradle encuentre siempre el binario de Node.js
 * en macOS (Homebrew, /usr/local/bin, o NVM), especialmente al compilar desde
 * Android Studio o entornos con PATH restringido.
 */
function withAndroidNodeResolver(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const androidDir = config.modRequest.platformProjectRoot;

      // 1. Parchar settings.gradle
      const settingsGradlePath = path.join(androidDir, "settings.gradle");
      if (fs.existsSync(settingsGradlePath)) {
        let content = fs.readFileSync(settingsGradlePath, "utf8");
        if (!content.includes("nodeExec")) {
          const nodeResolverCode = `  def nvmDir = new File("\${System.getProperty('user.home')}/.nvm/versions/node")
  def nvmNode = nvmDir.exists() ? nvmDir.listFiles()?.sort()?.reverse()?.collect { new File(it, "bin/node") }?.find { it.canExecute() }?.absolutePath : null
  def nodeCandidates = [
    providers.gradleProperty("nodeDir").orNull ? new File(providers.gradleProperty("nodeDir").get(), "node").absolutePath : null,
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    nvmNode
  ]
  def nodeExec = nodeCandidates.find { it != null && new File(it).canExecute() } ?: "node"
`;
          content = content.replace(
            "pluginManagement {\n",
            `pluginManagement {\n${nodeResolverCode}`,
          );
          content = content.replace(
            /commandLine\("node"/g,
            "commandLine(nodeExec",
          );
          fs.writeFileSync(settingsGradlePath, content, "utf8");
        }
      }

      // 2. Parchar app/build.gradle
      const appBuildGradlePath = path.join(
        androidDir,
        "app",
        "build.gradle",
      );
      if (fs.existsSync(appBuildGradlePath)) {
        let content = fs.readFileSync(appBuildGradlePath, "utf8");
        if (!content.includes("nodeExec")) {
          const nodeResolverApp = `
def nvmDir = new File("\${System.getProperty('user.home')}/.nvm/versions/node")
def nvmNode = nvmDir.exists() ? nvmDir.listFiles()?.sort()?.reverse()?.collect { new File(it, "bin/node") }?.find { it.canExecute() }?.absolutePath : null
def nodeCandidates = [
  findProperty("nodeDir") ? new File(findProperty("nodeDir"), "node").absolutePath : null,
  "/opt/homebrew/bin/node",
  "/usr/local/bin/node",
  nvmNode
]
def nodeExec = nodeCandidates.find { it != null && new File(it).canExecute() } ?: "node"
`;
          content = content.replace(
            'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()\n',
            `def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()\n${nodeResolverApp}`,
          );
          content = content.replace(
            /\["node",/g,
            "[nodeExec,",
          );
          content = content.replace(
            'bundleCommand = "export:embed"\n',
            'bundleCommand = "export:embed"\n    nodeExecutableAndArgs = [nodeExec]\n',
          );
          fs.writeFileSync(appBuildGradlePath, content, "utf8");
        }
      }

      // 3. Parchar gradle.properties
      const gradlePropertiesPath = path.join(
        androidDir,
        "gradle.properties",
      );
      if (fs.existsSync(gradlePropertiesPath)) {
        let content = fs.readFileSync(gradlePropertiesPath, "utf8");
        if (!content.includes("nodeDir=")) {
          content += "\nnodeDir=/opt/homebrew/bin\n";
          fs.writeFileSync(gradlePropertiesPath, content, "utf8");
        }
      }

      return config;
    },
  ]);
}

module.exports = withAndroidNodeResolver;
