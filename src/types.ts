export type Screen = 'initial' | 'confirmed_safe' | 'dispatch_status';

export type BridgeAction =
  | 'REQUEST_CANCEL'
  | 'REQUEST_DONE'
  | 'REQUEST_SAFE_CONFIRMATION'
  | 'REQUEST_STATUS_OK'
  | 'REQUEST_STATUS_NOT_OK';
