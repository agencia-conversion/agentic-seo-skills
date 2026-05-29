// Registers all built-in auto-block types. Import this once at sync entry
// points; new types just need to be added here.

import { registerAutoBlockType } from "../auto-block-registry";
import { clusters, clustersByArea } from "./clusters-by-area";
import { clusterContent } from "./cluster-content";
import { clusterIndex } from "./cluster-index";

let registered = false;

export function registerBuiltinAutoBlocks(): void {
  if (registered) return;
  registered = true;
  registerAutoBlockType(clusters);
  // Deprecated alias for pre-migration brain pages (ignores `area`).
  registerAutoBlockType(clustersByArea);
  registerAutoBlockType(clusterContent);
  registerAutoBlockType(clusterIndex);
}
