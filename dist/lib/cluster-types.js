"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDITORIAL_STATUS_OPTIONS = exports.INTENT_OPTIONS = exports.SENTINELS = exports.CONTRACT_VERSION = void 0;
exports.CONTRACT_VERSION = 1;
exports.SENTINELS = {
    contentBegin: "<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->",
    contentEnd: "<!-- END cluster-content-table:auto -->",
    indexBegin: "<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->",
    indexEnd: "<!-- END cluster-index-table:auto -->",
};
exports.INTENT_OPTIONS = [
    { value: "informational", label_pt: "Informacional", label_en: "Informational" },
    { value: "transactional", label_pt: "Transacional", label_en: "Transactional" },
    { value: "comparative", label_pt: "Comparativo", label_en: "Comparative" },
    { value: "navigational", label_pt: "Navegacional", label_en: "Navigational" },
];
exports.EDITORIAL_STATUS_OPTIONS = [
    { value: "draft", label_pt: "Rascunho", label_en: "Draft" },
    { value: "in-review", label_pt: "Em revisão", label_en: "In review" },
    { value: "approved", label_pt: "Aprovado", label_en: "Approved" },
    { value: "published", label_pt: "Publicado", label_en: "Published" },
];
