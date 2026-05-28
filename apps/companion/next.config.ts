import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // chokidar pulls in native fsevents on macOS — keep it external so Turbopack
  // does not try to embed the platform-specific .node binding into the server
  // bundle. The watcher runs at runtime via Node's require, not the bundler.
  serverExternalPackages: ["chokidar", "fsevents"],
};

export default nextConfig;
