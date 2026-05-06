export const TOKEN_CONFIG = {
  /** Encoding used by js-tiktoken */
  encoding: 'cl100k_base',

  /** Price per 1 million input tokens in USD (GPT-4o rate) */
  pricePerMillion: 2.5,

  /** Display label shown on the Token Usage Card */
  label: 'Estimated using cl100k_base encoding',

  /** Standard disclaimer */
  disclaimer:
    'Estimates are based on pasted user messages only and may differ from provider-billed tokens.',

  /** Fallback disclaimer when tokenizer fails to load */
  fallbackDisclaimer: 'Token estimation was unavailable for this analysis. Counts shown as zero.',
} as const;

export type TokenProvider = 'openai' | 'gemini' | 'perplexity';
export type EstimationType = 'provider_count' | 'local_estimate';

export interface ProviderOption {
  provider: TokenProvider;
  label: string;
  model: string;
  methodNote: string;
  /** Price per 1 million input tokens in USD */
  pricePerMillion: number;
  /** When true, the provider tab is shown but disabled */
  comingSoon?: boolean;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    provider: 'openai',
    label: 'OpenAI · gpt-4o',
    model: 'gpt-4o',
    methodNote: 'Estimated locally.',
    pricePerMillion: 2.5,
  },
  {
    provider: 'gemini',
    label: 'Gemini · gemini-2.5-flash',
    model: 'gemini-2.5-flash',
    methodNote: 'Counted via Gemini countTokens API.',
    pricePerMillion: 0.15,
  },
  {
    provider: 'perplexity',
    label: 'Perplexity · sonar-pro',
    model: 'sonar-pro',
    methodNote: 'Coming Soon (Too Expensive)',
    pricePerMillion: 3.0,
    comingSoon: true,
  },
];

export interface NormalizedTokenResponse {
  inputTokens: number;
  estimationType: EstimationType;
  provider: TokenProvider;
  model: string;
  warning?: string;
}

/** Map detected AI platform to the corresponding token provider */
export function platformToProvider(platform: string | null | undefined): TokenProvider {
  switch (platform) {
    case 'chatgpt':
      return 'openai';
    case 'gemini':
      return 'gemini';
    case 'perplexity':
      return 'perplexity';
    default:
      return 'openai';
  }
}
