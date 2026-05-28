"use strict";
// Auto-block registry for dynamic Markdown tables backed by structured sources.
// Each block type renders a Markdown table (or list) into a YAML literal scalar
// inside an `agentic-<type>` code fence. Sync replaces the materialized field
// when source data changes; user-controlled params stay intact.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAutoBlockType = registerAutoBlockType;
exports.getAutoBlockType = getAutoBlockType;
exports.listAutoBlockTypes = listAutoBlockTypes;
exports.isAutoBlockFenceName = isAutoBlockFenceName;
const registry = new Map();
function registerAutoBlockType(type) {
    registry.set(type.name, type);
}
function getAutoBlockType(name) {
    return registry.get(name);
}
function listAutoBlockTypes() {
    return Array.from(registry.keys());
}
function isAutoBlockFenceName(language) {
    return language.startsWith("agentic-");
}
