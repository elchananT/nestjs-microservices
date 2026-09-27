import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {clearInterval} from "node:timers";
import {createLogger} from "../../shared/src/observability/logging.js";

const SERVICE_NAME = 'discovery-service';
const logger = createLogger(SERVICE_NAME);

export interface ServiceInstance {
  name: string;
  url: string;
  healthy: boolean
}

@Injectable()
export class DiscoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly services = new Map<string, ServiceInstance[]>();

  private readonly healthCheckInterval = 5000
  private healthCheckTimer?: NodeJS.Timeout

  onModuleInit() {
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth()
    }, this.healthCheckInterval);
  }

  onModuleDestroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  register(name: string, url: string) {
    const instances = this.services.get(name) ?? []

    const existing = instances.find(instance => instance.url === url)
    if (existing) {
      return existing;
    }

    const instance = {
      name,
      url,
      healthy: true,
    }

    instances.push(instance);

    this.services.set(name, instances)

    return instance;
  }

  getService(name: string) {
    return this.services.get(name) ?? [];
  }

  async checkHealth() {
    for (const [serviceName, instances] of this.services) {
      const healthyInstances: ServiceInstance[] = []

      for (const instance of instances) {
        try {
          const response = await fetch(`${instance.url}/health`)

          if (response.ok) {
            healthyInstances.push(instance)
          }
        } catch {
          logger.warn(`Service ${instance.name} failed to fetch healthy instances`, {
            serviceName: instance.name,
            url: instance.url,
          })
        }
      }

      if (healthyInstances.length > 0) {
        this.services.set(serviceName, healthyInstances)
      } else {
        this.services.delete(serviceName)
      }
    }
  }
}
