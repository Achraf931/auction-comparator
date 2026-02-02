import type {
  AuctionData,
  CompareResponse,
  CompareError,
  UserInfo,
  SubscriptionInfo,
  UsageResponse,
  HistoryResponse,
} from '@auction-comparator/shared'

export type MessageType =
  | 'COMPARE_REQUEST'
  | 'COMPARE_RESPONSE'
  | 'AUTH_CHECK'
  | 'AUTH_CHECK_RESPONSE'
  | 'OPEN_LOGIN'
  | 'LOGOUT'
  | 'SETTINGS_GET'
  | 'SETTINGS_UPDATE'
  | 'USAGE_REQUEST'
  | 'USAGE_RESPONSE'
  | 'HISTORY_REQUEST'
  | 'HISTORY_RESPONSE';

export interface CompareRequestMessage {
  type: 'COMPARE_REQUEST';
  data: AuctionData;
}

export interface CompareResponseMessage {
  type: 'COMPARE_RESPONSE';
  success: true;
  data: CompareResponse;
}

export interface CompareErrorMessage {
  type: 'COMPARE_RESPONSE';
  success: false;
  error: CompareError;
}

export interface AuthCheckMessage {
  type: 'AUTH_CHECK';
}

export interface AuthCheckResponseMessage {
  type: 'AUTH_CHECK_RESPONSE';
  authenticated: boolean;
  hasSubscription: boolean;
  user?: UserInfo;
  subscription?: SubscriptionInfo;
}

export interface OpenLoginMessage {
  type: 'OPEN_LOGIN';
}

export interface LogoutMessage {
  type: 'LOGOUT';
}

export interface UsageRequestMessage {
  type: 'USAGE_REQUEST';
}

export interface UsageResponseMessage {
  type: 'USAGE_RESPONSE';
  success: true;
  data: UsageResponse;
}

export interface UsageErrorMessage {
  type: 'USAGE_RESPONSE';
  success: false;
  error: CompareError;
}

export interface HistoryRequestMessage {
  type: 'HISTORY_REQUEST';
  page?: number;
  pageSize?: number;
}

export interface HistoryResponseMessage {
  type: 'HISTORY_RESPONSE';
  success: true;
  data: HistoryResponse;
}

export interface HistoryErrorMessage {
  type: 'HISTORY_RESPONSE';
  success: false;
  error: CompareError;
}

export interface ForceRefreshRequestMessage {
  type: 'COMPARE_REQUEST';
  data: AuctionData;
  forceRefresh: true;
}

export type Message =
  | CompareRequestMessage
  | CompareResponseMessage
  | CompareErrorMessage
  | AuthCheckMessage
  | AuthCheckResponseMessage
  | OpenLoginMessage
  | LogoutMessage
  | UsageRequestMessage
  | UsageResponseMessage
  | UsageErrorMessage
  | HistoryRequestMessage
  | HistoryResponseMessage
  | HistoryErrorMessage
  | ForceRefreshRequestMessage;

/**
 * Send a message to the background script and wait for response
 */
export async function sendToBackground<T>(message: Message): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(response as T)
    })
  })
}

/**
 * Request a price comparison from the background script
 */
export async function requestComparison(
  auctionData: AuctionData
): Promise<CompareResponse> {
  const response = await sendToBackground<CompareResponseMessage | CompareErrorMessage>({
    type: 'COMPARE_REQUEST',
    data: auctionData,
  })

  if (!response.success) {
    const { error } = (response as CompareErrorMessage)
    const err = new Error(error.message);
    (err as any).code = error.code
    throw err
  }

  return (response as CompareResponseMessage).data
}

/**
 * Check authentication status
 */
export async function checkAuth(): Promise<AuthCheckResponseMessage> {
  return sendToBackground<AuthCheckResponseMessage>({
    type: 'AUTH_CHECK',
  })
}

/**
 * Open the login page in a new tab
 */
export async function openLogin(): Promise<void> {
  await sendToBackground<{ success: boolean }>({
    type: 'OPEN_LOGIN',
  })
}

/**
 * Logout and clear token
 */
export async function logout(): Promise<void> {
  await sendToBackground<{ success: boolean }>({
    type: 'LOGOUT',
  })
}

/**
 * Request a price comparison with force refresh option
 */
export async function requestComparisonWithRefresh(
  auctionData: AuctionData,
  forceRefresh: boolean = false
): Promise<CompareResponse> {
  const response = await sendToBackground<CompareResponseMessage | CompareErrorMessage>({
    type: 'COMPARE_REQUEST',
    data: auctionData,
    forceRefresh,
  } as ForceRefreshRequestMessage)

  if (!response.success) {
    const { error } = (response as CompareErrorMessage)
    const err = new Error(error.message);
    (err as any).code = error.code;
    (err as any).usage = (error as any).usage
    throw err
  }

  return (response as CompareResponseMessage).data
}

/**
 * Request current usage/quota info
 */
export async function requestUsage(): Promise<UsageResponse> {
  const response = await sendToBackground<UsageResponseMessage | UsageErrorMessage>({
    type: 'USAGE_REQUEST',
  })

  if (!response.success) {
    const { error } = (response as UsageErrorMessage)
    const err = new Error(error.message);
    (err as any).code = error.code
    throw err
  }

  return (response as UsageResponseMessage).data
}

/**
 * Request search history
 */
export async function requestHistory(
  page: number = 1,
  pageSize: number = 20
): Promise<HistoryResponse> {
  const response = await sendToBackground<HistoryResponseMessage | HistoryErrorMessage>({
    type: 'HISTORY_REQUEST',
    page,
    pageSize,
  })

  if (!response.success) {
    const { error } = (response as HistoryErrorMessage)
    const err = new Error(error.message);
    (err as any).code = error.code
    throw err
  }

  return (response as HistoryResponseMessage).data
}
