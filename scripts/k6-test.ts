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

    if (TEST_TYPE === 'plaintext') {
        res = http.get(url);
    }
    else if (TEST_TYPE === 'json-serialization') {
        res = http.get(url);
    }

    // ── READ (GET) ────────────────────────────────────────────────────────────
    else if (TEST_TYPE === 'read-one') {
        res = http.get(`${url}?id=${rand()}`);
    }
    else if (TEST_TYPE === 'read-many') {
        const offset = Math.floor(Math.random() * 9980);
        res = http.get(`${url}?limit=20&offset=${offset}`);
    }

    // ── CREATE (POST + JSON body) ─────────────────────────────────────────────
    else if (TEST_TYPE === 'create-one') {
        const body = JSON.stringify({ randomNumber: rand() });
        res = http.post(url, body, { headers: JSON_HEADERS });
    }
    else if (TEST_TYPE === 'create-many') {
        const items = Array.from({ length: 20 }, () => ({ randomNumber: rand() }));
        const body = JSON.stringify({ items });
        res = http.post(url, body, { headers: JSON_HEADERS });
    }

    // ── UPDATE (PATCH, PUT + JSON body) ──────────────────────────────────────────────
    else if (TEST_TYPE === 'update-one') {
        const body = JSON.stringify({ randomNumber: rand() });
        res = http.patch(`${url}/${rand()}`, body, { headers: JSON_HEADERS });
    }
    else if (TEST_TYPE === 'update-many') {
        const ids = uniqueIds(20);
        const items = ids.map(id => ({ id, randomNumber: rand() }));
        const body = JSON.stringify({ items });
        res = http.put(url, body, { headers: JSON_HEADERS });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    // Each VU operates on a non-overlapping block of IDs so deletes are
    // sequential (1, 2, 3, …) within every VU and never conflict across VUs.
    else if (TEST_TYPE === 'delete-one') {
        const id = (__VU - 1) * 200_000 + __ITER + 1;
        res = http.del(`${url}/${id}`);
    }
    else if (TEST_TYPE === 'delete-many') {
        const baseId = (__VU - 1) * 200_000 + __ITER * 20 + 1;
        const ids = Array.from({ length: 20 }, (_, i) => baseId + i);
        const body = JSON.stringify({ ids });
        res = http.del(url, body, { headers: JSON_HEADERS });
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
