const fs = require("fs");
const path = require("path");
const {
  IOSConfig,
  withDangerousMod,
  withEntitlementsPlist,
  withXcodeProject,
} = require("@expo/config-plugins");

const CONTAINER_ID = "iCloud.com.cajita.app";

const PODFILE_WARNINGS_SNIPPET = `    # Silencia warnings de compilación, cabeceras ObjC (.pcm), libtool y scripts en Pods
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
        bc.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
        bc.build_settings['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'NO'
        bc.build_settings['OTHER_LIBTOOLFLAGS'] = '$(inherited) -no_warning_for_no_symbols'
        swift_flags = bc.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
        unless swift_flags.to_s.include?('-Xcc -w')
          bc.build_settings['OTHER_SWIFT_FLAGS'] = "#{swift_flags} -Xcc -w"
        end
      end
      target.build_phases.each do |phase|
        if phase.respond_to?(:output_paths) && (phase.output_paths.nil? || phase.output_paths.empty?) && phase.respond_to?(:always_out_of_date=)
          phase.always_out_of_date = '1'
        end
      end
    end`;

const SCENE_DELEGATE_SWIFT = `internal import Expo
import UIKit

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  private static func route(for shortcutType: String) -> String? {
    switch shortcutType {
    case "com.cajita.app.new-expense":
      return "/transaction/new?mode=expense"
    case "com.cajita.app.new-income":
      return "/transaction/new?mode=income"
    case "com.cajita.app.new-transfer":
      return "/transaction/new?mode=transfer"
    case "com.cajita.app.cash":
      return "/cash"
    default:
      return nil
    }
  }

  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    super.scene(scene, willConnectTo: session, options: connectionOptions)
    if let shortcutItem = connectionOptions.shortcutItem,
       let route = Self.route(for: shortcutItem.type) {
      Task { @MainActor in
        triggerCajitaShortcut(route: route)
      }
    }
  }

  override func windowScene(
    _ windowScene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    if let route = Self.route(for: shortcutItem.type) {
      Task { @MainActor in
        triggerCajitaShortcut(route: route)
      }
      completionHandler(true)
    } else {
      completionHandler(false)
    }
  }
}
`;

module.exports = function withCajitaEntitlements(config) {
  config = withEntitlementsPlist(config, (c) => {
    c.modResults["com.apple.developer.icloud-container-identifiers"] = [
      CONTAINER_ID,
    ];
    c.modResults["com.apple.developer.icloud-services"] = ["CloudDocuments"];
    c.modResults["com.apple.developer.ubiquity-kvstore-identifier"] =
      "$(TeamIdentifierPrefix)$(CFBundleIdentifier)";

    return c;
  });

  config = withXcodeProject(config, (c) => {
    const project = c.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(
      c.modRequest.projectRoot
    );

    const filePath = `${projectName}/CajitaShortcuts.swift`;
    if (!project.hasFile(filePath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: filePath,
        groupName: projectName,
        project,
      });
    }

    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const cfg = configurations[key];
      if (cfg && cfg.buildSettings) {
        cfg.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
        cfg.buildSettings.GCC_WARN_INHIBIT_ALL_WARNINGS = "YES";
        cfg.buildSettings.SWIFT_SUPPRESS_WARNINGS = "YES";
        if (cfg.name === "Debug") {
          cfg.buildSettings.DEBUG_INFORMATION_FORMAT = "dwarf";
        }
        if (
          typeof cfg.buildSettings.OTHER_SWIFT_FLAGS === "string" &&
          !cfg.buildSettings.OTHER_SWIFT_FLAGS.includes("-Xcc -w")
        ) {
          cfg.buildSettings.OTHER_SWIFT_FLAGS =
            cfg.buildSettings.OTHER_SWIFT_FLAGS.replace(/^"|"$/g, "") +
            " -Xcc -w";
          cfg.buildSettings.OTHER_SWIFT_FLAGS = `"${cfg.buildSettings.OTHER_SWIFT_FLAGS}"`;
        }
      }
    }

    const buildPhases =
      project.hash.project.objects.PBXShellScriptBuildPhase || {};
    for (const key of Object.keys(buildPhases)) {
      const phase = buildPhases[key];
      if (phase && typeof phase.shellScript === "string") {
        if (
          phase.shellScript.includes("expo-configure-project.sh") &&
          !phase.shellScript.includes("CoreModule")
        ) {
          phase.shellScript = phase.shellScript.replace(
            'expo-configure-project.sh\\"',
            'expo-configure-project.sh\\" 2>&1 | grep -v \\"class \'CoreModule\'\\" || true'
          );
        }
        if (phase.shellScript.includes("SKIP_BUNDLING=1")) {
          phase.shellScript = phase.shellScript.replace(
            'if [[ \\"$CONFIGURATION\\" = *Debug* ]]; then\\n  export SKIP_BUNDLING=1\\nfi',
            "export FORCE_BUNDLING=1"
          );
        }
        if (
          phase.shellScript.includes("react-native-xcode.sh") &&
          !phase.shellScript.includes("main\\\\.jsbundle")
        ) {
          phase.shellScript = phase.shellScript.replace(
            "react-native-xcode.sh'\\\"`\\\"\"",
            "react-native-xcode.sh'\\\"`\\\"\" 2>&1 | grep -v -E \\\"(main\\\\.jsbundle:.*warning:|warning: Bundler cache is empty)\\\" || true"
          );
        }
      }
    }
    return c;
  });

  config = withDangerousMod(config, [
    "ios",
    async (c) => {
      const platformRoot = c.modRequest.platformProjectRoot;
      const shortcutsSrc = fs.readFileSync(
        path.join(c.modRequest.projectRoot, "plugins", "CajitaShortcuts.swift"),
        "utf8"
      );
      const appDir = path.join(platformRoot, "Cajita");
      if (fs.existsSync(appDir)) {
        fs.writeFileSync(
          path.join(appDir, "CajitaShortcuts.swift"),
          shortcutsSrc,
          "utf8"
        );
        fs.writeFileSync(
          path.join(appDir, "SceneDelegate.swift"),
          SCENE_DELEGATE_SWIFT,
          "utf8"
        );
        const appDelegatePath = path.join(appDir, "AppDelegate.swift");
        if (fs.existsSync(appDelegatePath)) {
          let ad = fs.readFileSync(appDelegatePath, "utf8");
          if (!ad.includes("Bundle.main.url(forResource: \"main\", withExtension: \"jsbundle\")\n      ??")) {
            ad = ad.replace(
              'return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")',
              'return Bundle.main.url(forResource: "main", withExtension: "jsbundle")\n      ?? RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")'
            );
            fs.writeFileSync(appDelegatePath, ad, "utf8");
          }
        }
      }

      const podfilePath = path.join(platformRoot, "Podfile");
      if (fs.existsSync(podfilePath)) {
        let content = fs.readFileSync(podfilePath, "utf8");
        if (!content.includes("inhibit_all_warnings!")) {
          content = content.replace(
            "prepare_react_native_project!",
            "prepare_react_native_project!\ninhibit_all_warnings!"
          );
        }
        if (!content.includes("GCC_WARN_INHIBIT_ALL_WARNINGS")) {
          content = content.replace(
            /(\s*react_native_post_install\([\s\S]*?\)\n)/,
            `$1${PODFILE_WARNINGS_SNIPPET}\n`
          );
        }
        fs.writeFileSync(podfilePath, content, "utf8");
      }
      return c;
    },
  ]);

  return config;
};
