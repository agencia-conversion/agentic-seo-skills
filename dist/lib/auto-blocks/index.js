"use strict";
// Registers all built-in auto-block types. Import this once at sync entry
// points; new types just need to be added here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBuiltinAutoBlocks = registerBuiltinAutoBlocks;
const auto_block_registry_1 = require("../auto-block-registry");
const clusters_by_area_1 = require("./clusters-by-area");
const cluster_content_1 = require("./cluster-content");
const cluster_index_1 = require("./cluster-index");
let registered = false;
function registerBuiltinAutoBlocks() {
    if (registered)
        return;
    registered = true;
    (0, auto_block_registry_1.registerAutoBlockType)(clusters_by_area_1.clustersByArea);
    (0, auto_block_registry_1.registerAutoBlockType)(cluster_content_1.clusterContent);
    (0, auto_block_registry_1.registerAutoBlockType)(cluster_index_1.clusterIndex);
}
