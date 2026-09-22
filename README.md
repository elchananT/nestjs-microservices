```
ts

import {Injectable, NotFoundException, Optional, ServiceUnavailableException} from '@nestjs/common';
import {
    BrokenCircuitError,
    bulkhead,
    circuitBreaker,
    ConsecutiveBreaker,
    ExponentialBackoff,
    handleWhen,
    retry,
    timeout,
    TimeoutStrategy,
    wrap,
    type IBackoffFactory,
    type IRetryBackoffContext,
} from 'cockatiel';

export class ProductServiceError extends Error {
    constructor(
        public readonly status: number,
        message?: string,
    ) {
        super(message ?? `Product Service returned ${status}`);
        this.name = 'ProductServiceError';
    }
}

export interface ResilienceOptions {
    maxAttempts: number;
    timeoutMs: number;
    failureThreshold: number;
    halfOpenAfterMs: number;
    bulkheadLimit: number;
    bulkheadQueue: number;
    productBaseUrl: string;
    fetcher: typeof fetch;
    backoff: IBackoffFactory<IRetryBackoffContext<unknown>>;
}

const DEFAULT_OPTIONS: ResilienceOptions = {
    maxAttempts: 3,
    timeoutMs: 5_000,
    failureThreshold: 3,
    halfOpenAfterMs: 10_000,
    bulkheadLimit: 10,
    bulkheadQueue: 10,
    productBaseUrl: 'http://localhost:3000',
    fetcher: (input, init) => fetch(input, init),
    backoff: new ExponentialBackoff(),
};

function isRetryableFailure(error: unknown): boolean {
    if (error instanceof ProductServiceError) {
        return error.status >= 500;
    }
    if (error instanceof BrokenCircuitError) {
        return false;
    }
    return true;
}

@Injectable()
export class ResilienceService {
    private readonly options: ResilienceOptions;
    private readonly productPolicy: {
        execute<T>(fn: (context: {signal: AbortSignal}) => PromiseLike<T> | T): Promise<T>;
    };

    constructor(@Optional() options: Partial<ResilienceOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };

        const failureFilter = handleWhen(isRetryableFailure);

        const retryPolicy = retry(failureFilter, {
            maxAttempts: this.options.maxAttempts,
            backoff: this.options.backoff,
        });

        const circuitBreakerPolicy = circuitBreaker(failureFilter, {
            breaker: new ConsecutiveBreaker(this.options.failureThreshold),
            halfOpenAfter: this.options.halfOpenAfterMs,
        });

        const timeoutPolicy = timeout(this.options.timeoutMs, TimeoutStrategy.Aggressive);

        const bulkheadPolicy = bulkhead(this.options.bulkheadLimit, this.options.bulkheadQueue);

        this.productPolicy = wrap(bulkheadPolicy, retryPolicy, circuitBreakerPolicy, timeoutPolicy);
    }

    async getProduct(productId: number) {
        try {
            return await this.productPolicy.execute(async ({ signal }) => {
                const response = await this.options.fetcher(
                    `${this.options.productBaseUrl}/products/${productId}`,
                    { signal },
                );

                if (!response.ok) {
                    throw new ProductServiceError(
                        response.status,
                        response.status === 404 ? 'Product not found' : undefined,
                    );
                }

                return response.json();
            });
        } catch (error) {
            if (error instanceof ProductServiceError && error.status === 404) {
                throw new NotFoundException('Product not found');
            }
            throw new ServiceUnavailableException('Product Service is temporarily unavailable');
        }
    }
}
```