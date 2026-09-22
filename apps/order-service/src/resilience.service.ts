import {
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
    Optional,
    ServiceUnavailableException
} from '@nestjs/common';
import {ResilienceOptions} from "./resilience.types.js";
import {
    BrokenCircuitError,
    bulkhead, BulkheadRejectedError,
    circuitBreaker,
    ConsecutiveBreaker,
    ExponentialBackoff,
    handleWhen,
    retry,
    timeout,
    TimeoutStrategy,
    wrap
} from "cockatiel";
import {ConfigService} from "@nestjs/config";

export class ProductServiceError extends Error {
    constructor(
        public readonly status: number,
        message?: string,
    ) {
        super(message ?? `Product Service Returned ${status}`);

        this.name = "ProductServiceError";
    }
}

function isRetryableFailure(error: unknown): boolean {
    if (error instanceof ProductServiceError) {
        return error.status >= 500
    }

    if (error instanceof BrokenCircuitError) {
        return false
    }

    return true
}

@Injectable()
export class ResilienceService {
    private readonly options: ResilienceOptions;
    private readonly productPolicy: {
        execute<T>(
            fn: (context: {signal: AbortSignal}) => PromiseLike<T> | T,
        ): Promise<T>
    }

    constructor(
       private readonly config: ConfigService,
    ) {
        this.options = {
            productBaseUrl: 'http://localhost:3000',
            fetcher: (input, init) => fetch(input, init),
            backoff: new ExponentialBackoff(),

            timeoutMs: this.config.getOrThrow<number>('resilience.timeoutMs'),
            maxAttempts: this.config.getOrThrow<number>('resilience.maxAttempts'),
            failureThreshold: this.config.getOrThrow<number>('resilience.failureThreshold'),
            halfOpenAfterMs: this.config.getOrThrow<number>('resilience.halfOpenAfterMs'),
            bulkheadLimit: this.config.getOrThrow<number>('resilience.bulkheadLimit'),
            bullheadQueue: this.config.getOrThrow<number>('resilience.bullheadQueue'),
        }

        const failureFilter = handleWhen(isRetryableFailure)

        const timeoutPolicy = timeout(
            this.options.timeoutMs,
            TimeoutStrategy.Aggressive
        )

        const retryPolicy = retry(
            failureFilter,
            {
                maxAttempts: this.options.maxAttempts,
                backoff: this.options.backoff,
            }
        )

        const circuitBreakerPolicy = circuitBreaker(
            failureFilter,
            {
                breaker: new ConsecutiveBreaker(this.options.failureThreshold),
                halfOpenAfter: this.options.halfOpenAfterMs,
            }
        )

        const bulkheadPolicy = bulkhead(
            this.options.bulkheadLimit,
            this.options.bullheadQueue
        )

        this.productPolicy = wrap(bulkheadPolicy, circuitBreakerPolicy, retryPolicy, timeoutPolicy)
    }

    async getProduct(productId: number) {
        try {
            return await this.productPolicy.execute(async ({signal}) => {
                const response = await this.options.fetcher(
                    `${this.options.productBaseUrl}/products/${productId}`,
                    { signal },
                )

                if (!response.ok) {
                    throw new ProductServiceError(
                        response.status,
                        response.status === 404 ? 'Product Not Found'
                            : 'Product Service Failed'
                    )
                }

                return response.json()
            })
        } catch (error: unknown) {
            throw this.handleError(error);
        }
    }

    private handleError(error: unknown): Error {
        if (error instanceof ProductServiceError) {
            if (error.status === 404) {
                return new NotFoundException('Product Not Found')
            }

            if (error.status >= 500) {
                return new ServiceUnavailableException('Product Service is temporarily unavailable')
            }

            return new ServiceUnavailableException('Product Service request failed')
        }

        if (error instanceof BulkheadRejectedError) {
            return new HttpException(
                'To Many Requests. Please try again later',
                HttpStatus.TOO_MANY_REQUESTS
            )
        }

        if (error instanceof BrokenCircuitError) {
            return new ServiceUnavailableException('Product Service is temporarily unavailable')
        }

        return new ServiceUnavailableException('An unexpected error occurred. Please try again later')
    }
}
