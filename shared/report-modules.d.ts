export declare const REPORT_DIR_NAME: string;

export declare const REPORT_BROWSER_PROMPT_MESSAGE: string;

export interface ReportModuleDefinition {
  id: string;
  title: { "pt-BR": string; en: string };
}

export declare const REPORT_MODULES: readonly ReportModuleDefinition[];

export declare const REPORT_MODULE_IDS: readonly string[];

export declare function reportModuleLabel(moduleId: string, locale?: "pt-BR" | "en" | string): string;
