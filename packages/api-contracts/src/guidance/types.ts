export type GuidanceLanguageDto = 'en' | 'zh';
export type GuidanceClefDto = 'treble' | 'bass';

export interface ChatRequestDto {
  readonly message: string;
  readonly clef: GuidanceClefDto;
  readonly lang: GuidanceLanguageDto;
}

export interface ExerciseProposalDto {
  readonly title: string;
  readonly notes: readonly string[];
  readonly description: string;
}

export interface ChatReplyDto {
  readonly replyText: string;
  readonly challengeData: ExerciseProposalDto | null;
}

export type GuidanceErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'provider_unavailable'
  | 'invalid_provider_response'
  | 'internal';

export interface GuidanceApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
  readonly requestId: string;
}

export interface GuidanceApiFailure {
  readonly ok: false;
  readonly error: {
    readonly code: GuidanceErrorCode;
    readonly retryable: boolean;
  };
  readonly requestId: string;
}

export type GuidanceApiResult<T> = GuidanceApiSuccess<T> | GuidanceApiFailure;
