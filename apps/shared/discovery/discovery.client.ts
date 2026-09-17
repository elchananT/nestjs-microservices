export interface ServiceRegistration {
    name: string;
    url: string;
}

export interface ServiceInstance {
    name: string;
    url: string;
    healthy: boolean
}

const DISCOVERY_URL = 'http://localhost:3004'

export async function register(service: ServiceRegistration) {
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

export async function getService(serviceName: string): Promise<ServiceInstance[]> {
    const response = await fetch(`${DISCOVERY_URL}/discovery/${serviceName}`)

    if (!response.ok) {
        throw new Error(`Failed to register ${serviceName}`);
    }

    return response.json();
}