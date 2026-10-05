export interface ServiceRegistration {
    name: string;
    url: string;
}

export interface ServiceInstance {
    name: string;
    url: string;
    healthy: boolean
}

const DISCOVERY_URL = process.env.DISCOVERY_URL ?? 'http://localhost:4000'
const REGISTRATION_INTERVAL_MS = 5_000;
const registrationTimers = new Map<string, NodeJS.Timeout>();

async function registerOnce(service: ServiceRegistration) {
    const response = await fetch(
        `${DISCOVERY_URL}/discovery/register`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(service)
        }
    )

    if (!response.ok) {
        throw new Error(`Failed to register ${service.name}`);
    }

    return response.json();
}

export async function register(service: ServiceRegistration) {
    const registrationKey = `${service.name}:${service.url}`;
    const registered = await registerOnce(service);

    // Discovery keeps registrations in memory. Re-register periodically so a
    // service becomes discoverable again after Discovery Service restarts.
    if (!registrationTimers.has(registrationKey)) {
        const timer = setInterval(() => {
            void registerOnce(service).catch((error: unknown) => {
                console.warn(`Failed to renew discovery registration for ${service.name}`, error);
            });
        }, REGISTRATION_INTERVAL_MS);
        timer.unref();
        registrationTimers.set(registrationKey, timer);
    }

    return registered;
}

export async function getService(serviceName: string): Promise<ServiceInstance[]> {
    const response = await fetch(`${DISCOVERY_URL}/discovery/${serviceName}`)

    if (!response.ok) {
        throw new Error(`Failed to register ${serviceName}`);
    }

    return response.json();
}
