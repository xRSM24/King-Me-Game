import fs from "node:fs";
import path from "node:path";

const plistPath = path.join("ios", "App", "App", "Info.plist");
if (fs.existsSync(plistPath)) {
  let plist = fs.readFileSync(plistPath, "utf8");
  if (!plist.includes("ITSAppUsesNonExemptEncryption")) {
    plist = plist.replace(
      "</dict>\n</plist>",
      `\t<key>ITSAppUsesNonExemptEncryption</key>
\t<false/>
\t<key>UIRequiresFullScreen</key>
\t<true/>
</dict>
</plist>`,
    );
  }
  plist = plist.replace(
    /<key>UISupportedInterfaceOrientations<\/key>\s*<array>[\s\S]*?<\/array>/,
    `<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>`,
  );
  fs.writeFileSync(plistPath, plist);
  console.log("patched", plistPath);
}

const privacy = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyTrackingDomains</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array>
		<dict>
			<key>NSPrivacyCollectedDataType</key>
			<string>NSPrivacyCollectedDataTypeName</string>
			<key>NSPrivacyCollectedDataTypeLinked</key>
			<false/>
			<key>NSPrivacyCollectedDataTypeTracking</key>
			<false/>
			<key>NSPrivacyCollectedDataTypePurposes</key>
			<array>
				<string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
			</array>
		</dict>
	</array>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
`;

const privacyPath = path.join("ios", "App", "App", "PrivacyInfo.xcprivacy");
if (fs.existsSync(path.dirname(privacyPath))) {
  fs.writeFileSync(privacyPath, privacy);
  console.log("wrote", privacyPath);
}

const gradle = path.join("android", "app", "build.gradle");
if (fs.existsSync(gradle)) {
  let g = fs.readFileSync(gradle, "utf8");
  g = g.replace(/versionName "[^"]+"/, 'versionName "1.0.0"');
  fs.writeFileSync(gradle, g);
}

const manifest = path.join("android", "app", "src", "main", "AndroidManifest.xml");
if (fs.existsSync(manifest)) {
  let m = fs.readFileSync(manifest, "utf8");
  if (!m.includes("android:screenOrientation")) {
    m = m.replace(
      'android:exported="true"',
      'android:exported="true"\n            android:screenOrientation="portrait"',
    );
    fs.writeFileSync(manifest, m);
    console.log("patched", manifest);
  }
}

const pbx = path.join("ios", "App", "App.xcodeproj", "project.pbxproj");
if (fs.existsSync(pbx)) {
  let p = fs.readFileSync(pbx, "utf8");
  p = p.replace(/MARKETING_VERSION = 1\.0;/g, "MARKETING_VERSION = 1.0.0;");
  if (!p.includes("PrivacyInfo.xcprivacy")) {
    p = p.replace(
      "/* End PBXBuildFile section */",
      `\t\tC1EC8A011A2B3C4D00000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = C1EC8A001A2B3C4D00000001 /* PrivacyInfo.xcprivacy */; };
/* End PBXBuildFile section */`,
    );
    p = p.replace(
      "/* End PBXFileReference section */",
      `\t\tC1EC8A001A2B3C4D00000001 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };
/* End PBXFileReference section */`,
    );
    p = p.replace(
      "504EC3131FED79650016851F /* Info.plist */,",
      `504EC3131FED79650016851F /* Info.plist */,
				C1EC8A001A2B3C4D00000001 /* PrivacyInfo.xcprivacy */,`,
    );
    p = p.replace(
      "2FAD9763203C412B000D30F8 /* config.xml in Resources */,",
      `2FAD9763203C412B000D30F8 /* config.xml in Resources */,
				C1EC8A011A2B3C4D00000001 /* PrivacyInfo.xcprivacy in Resources */,`,
    );
  }
  fs.writeFileSync(pbx, p);
  console.log("patched", pbx);
}
