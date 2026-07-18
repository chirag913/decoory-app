const { TwaManifest } = require("@bubblewrap/core");

(async () => {
  const manifest = await TwaManifest.fromWebManifest("https://app.decoory.com/manifest.webmanifest");
  manifest.packageId = "com.decoory.client";
  manifest.launcherName = "Decoory";
  manifest.appVersionName = "1";
  manifest.appVersionCode = 1;
  manifest.enableNotifications = false;
  await manifest.saveToFile("./twa-manifest.json");
  console.log("twa-manifest.json written");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
