# Web Benchmarks Competitors

This directory contains the various framework implementations (competitors) for the web benchmarks.

## Implementing a Competitor

To add a new competitor, create a folder with the competitor's name (e.g., `my-framework`). Inside, you must provide a `Dockerfile` that exposes an HTTP server on port `3000`.

Values defined in the `env` block for a competitor in `bench.config.yml` are passed to the Docker build as `--build-arg` parameters and also injected as runtime environment variables in the resulting Kubernetes pod.

### Required Endpoints

The benchmark uses **k6** to generate load. To ensure fair testing without timing internal random number generation, k6 will pass all randomized data via query parameters.

Your application must implement the following endpoints and handle the provided query parameters:

1. **`GET /plaintext`**
   - Returns a simple `text/plain` response (e.g., "Hello World!").

2. **`GET /json`**
   - Returns a simple `application/json` response (e.g., `{"message": "Hello World!"}`).

3. **`GET /database/single-read?id=[number]`**
   - Queries the `World` table for the row with the specified `id`.
   - Returns the row as JSON: `{"id": 123, "randomNumber": 4567}`.

4. **`GET /database/multiple-read?limit=[number]&offset=[number]`**
   - Queries the `World` table returning a list of rows using the provided `limit` and `offset` (e.g. `ORDER BY id LIMIT limit OFFSET offset`).
   - Returns a JSON array of rows.

5. **`GET /database/single-write?id=[number]&randomNumber=[number]`**
   - Fetches the row with the given `id`, updates its `randomNumber` field in the database to the provided `randomNumber` query parameter, and returns the updated row.

6. **`GET /database/multiple-write?limit=[number]&offset=[number]&r=[num1,num2,num3...]`**
   - Fetches a list of rows using `limit` and `offset`.
   - Updates the fetched rows using the corresponding values from the comma-separated `r` parameter array. Ensure you update the rows with the exact numbers provided in `r` sequentially for the items you fetched.
   - Returns the updated JSON array of rows.

### Database Schema

The provided database (PostgreSQL or MSSQL) will automatically be seeded with a table called `World`:

```sql
CREATE TABLE World (
  id INT PRIMARY KEY,
  randomNumber INT NOT NULL
);
```
It contains 10,000 rows with random numbers.
