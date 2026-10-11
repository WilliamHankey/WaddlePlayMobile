/* global __dirname */
const fs = require("node:fs");
const path = require("node:path");
const base = require("./app.json").expo;

module.exports = () => ({
  ...base,
  android: {
    ...base.android,
    ...(fs.existsSync(path.join(__dirname, "android/app/google-services.json"))
      ? { googleServicesFile: "./android/app/google-services.json" }
      : {}),
  },
});
