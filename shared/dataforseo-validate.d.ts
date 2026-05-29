export declare const DATAFORSEO_VALIDATE_URL: string;

export declare const DATAFORSEO_VALID_MODES: readonly string[];

export interface DataForSeoValidationResult {
  validated: boolean;
  reason?: string;
  validated_at?: string;
}

export declare function validateDataForSeo(
  login: string,
  password: string,
  mode: string,
  fetchImpl?: typeof fetch
): Promise<DataForSeoValidationResult>;
