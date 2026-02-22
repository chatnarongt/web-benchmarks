import http from 'k6/http';
import { check } from 'k6';

// Read target URL and test type from environment variables
const TARGET_URL: string = __ENV.TARGET_URL || 'http://localhost:3000';
const TEST_TYPE: string = __ENV.TEST_TYPE || 'plaintext';

export default function (): void {
    const url: string = TARGET_URL;
    let res: any;

    // Helper to generate a random number between 1 and 10000
    const rand = (): number => Math.floor(Math.random() * 10000) + 1;

    if (TEST_TYPE === 'plaintext' || TEST_TYPE === 'json') {
        // No query parameters needed
        res = http.get(url);
    }
    else if (TEST_TYPE === 'database/single-read') {
        const id: number = rand();
        res = http.get(`${url}?id=${id}`);
    }
    else if (TEST_TYPE === 'database/multiple-read') {
        const limit: number = 20;
        const offset: number = Math.floor(Math.random() * (10000 - limit));
        res = http.get(`${url}?limit=${limit}&offset=${offset}`);
    }
    else if (TEST_TYPE === 'database/single-write') {
        const id: number = rand();
        const randomNumber: number = rand();
        res = http.get(`${url}?id=${id}&randomNumber=${randomNumber}`);
    }
    else if (TEST_TYPE === 'database/multiple-write') {
        const limit: number = 20;
        const offset: number = Math.floor(Math.random() * (10000 - limit));
        const rVals: string = Array.from({ length: limit }, () => rand()).join(',');
        res = http.get(`${url}?limit=${limit}&offset=${offset}&r=${rVals}`);
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
