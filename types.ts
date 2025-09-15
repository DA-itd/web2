
export enum ValidationStatus {
  IDLE = 'idle',
  SUCCESS = 'success',
  NOT_FOUND = 'not_found',
  ERROR = 'error',
}

export interface CertificateData {
  [key: string]: string | number | null | undefined;
}
