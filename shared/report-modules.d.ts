export declare const REPORT_DIR_NAME: string;

export declare const REPORT_BROWSER_PROMPT_MESSAGE: string;

export interface ReportModuleDefinition {
  id: string;
  title: { "pt-BR": string; en: string };
  /**
   * When false, the module is documented (skill exists, report_type accepted,
   * Companion knows the slug) but no CLI handler exists yet, so
   * `reviewReportsInProject` with `requireAllModules` MUST NOT require a
   * report under this module's folder. Defaults to true.
   */
  cli_ready?: boolean;
}

export declare const REPORT_MODULES: readonly ReportModuleDefinition[];

export declare const REPORT_MODULE_IDS: readonly string[];

export declare function reportModuleLabel(moduleId: string, locale?: "pt-BR" | "en" | string): string;
