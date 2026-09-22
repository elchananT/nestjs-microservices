import {IBackoffFactory, IRetryBackoffContext} from "cockatiel";

export interface ResilienceOptions {
    productBaseUrl: string;
    fetcher: typeof fetch;
    timeoutMs: number;
    maxAttempts: number;
    backoff: IBackoffFactory<IRetryBackoffContext<unknown>>;
    failureThreshold: number;
    halfOpenAfterMs: number;
    bulkheadLimit: number;
    bullheadQueue: number
}