import http from 'k6/http';
import { check } from 'k6';

// Read target URL and test type from environment variables
const TARGET_URL: string = __ENV.TARGET_URL || 'http://localhost:3000';
const TEST_TYPE: string = __ENV.TEST_TYPE || 'plaintext';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function (): void {
    const url: string = TARGET_URL;
    let res: any;

    // Helper to generate a random integer between 1 and 10000 (inclusive)
    const rand = (): number => Math.floor(Math.random() * 10000) + 1;

    // Helper to pick `count` unique random integers in range [1, 10000]
    const uniqueIds = (count: number): number[] => {
        const set = new Set<number>();
        while (set.size < count) set.add(rand());
        return [...set];
    };

    if (TEST_TYPE === 'plaintext' || TEST_TYPE === 'json') {
        res = http.get(url);
    }

    // ── READ (GET) ────────────────────────────────────────────────────────────
    else if (TEST_TYPE === 'single-read') {
        res = http.get(`${url}?id=${rand()}`);
    }
    else if (TEST_TYPE === 'multiple-read') {
        const ids = uniqueIds(20).join(',');
        res = http.get(`${url}?ids=${ids}`);
    }

    // ── CREATE (POST + JSON body) ─────────────────────────────────────────────
    else if (TEST_TYPE === 'single-create') {
        const body = JSON.stringify({ randomNumber: rand() });
        res = http.post(url, body, { headers: JSON_HEADERS });
    }
    else if (TEST_TYPE === 'multiple-create') {
        const r = Array.from({ length: 20 }, () => rand());
        const body = JSON.stringify({ r });
        res = http.post(url, body, { headers: JSON_HEADERS });
    }

    // ── UPDATE (PUT + JSON body) ──────────────────────────────────────────────
    else if (TEST_TYPE === 'single-update') {
        const body = JSON.stringify({ id: rand(), randomNumber: rand() });
        res = http.put(url, body, { headers: JSON_HEADERS });
    }
    else if (TEST_TYPE === 'multiple-update') {
        const ids = uniqueIds(20);
        const r = Array.from({ length: 20 }, () => rand());
        const body = JSON.stringify({ ids, r });
        res = http.put(url, body, { headers: JSON_HEADERS });
    }

    // ── DELETE (DELETE + query params) ────────────────────────────────────────
    else if (TEST_TYPE === 'single-delete') {
        res = http.del(`${url}?id=${rand()}`);
    }
    else if (TEST_TYPE === 'multiple-delete') {
        const ids = uniqueIds(20).join(',');
        res = http.del(`${url}?ids=${ids}`);
    }

    if (res) {
        check(res, {
            'is status 2xx': (r: any) => r.status >= 200 && r.status < 300,
        });
    }
}

export function handleSummary(data: any): any {
    return {
        'stdout': "K6_JSON_SUMMARY_START\n" + JSON.stringify(data) + "\nK6_JSON_SUMMARY_END\n",
    };
}
