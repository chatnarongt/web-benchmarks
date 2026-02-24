# Web Benchmarks Competitors

This directory contains the various framework implementations (competitors) for the web benchmarks.

## Implementing a Competitor

To add a new competitor, create a folder with the competitor's name (e.g., `my-framework`). Inside, you must provide a `Dockerfile` that exposes an HTTP server on port `3000`.

Values defined in the `env` block for a competitor in `bench.config.yml` are passed to the Docker build as `--build-arg` parameters and also injected as runtime environment variables in the resulting Kubernetes pod.

### Required Endpoints

The benchmark uses **k6** to generate load. To ensure fair testing without timing internal random number generation, k6 will pass all randomized data via query parameters or request body depending on the HTTP method.

Your application must implement the following endpoints:

1. **`GET /plaintext`**
   - Returns a simple `text/plain` response (e.g., "Hello World!").

2. **`GET /json`**
   - Returns a simple `application/json` response (e.g., `{"message": "Hello World!"}`).

#### Read — `GET`

3. **`GET /single-read?id=[number]`**
   - Queries the `World` table for the row with the specified `id`.
   - Returns the row as JSON: `{"id": 123, "randomNumber": 4567}`.

4. **`GET /multiple-read?ids=[id1,id2,id3...]`**
   - Fetches the rows whose `id` values are provided in the comma-separated `ids` parameter (e.g. `WHERE id IN (...)`).
   - Returns a JSON array of rows.

#### Create — `POST`

5. **`POST /single-create`**
   - Request body: `{"randomNumber": 4567}`
   - Inserts a new row into the `Temp` table with the given `randomNumber`.
   - Returns the newly created row as JSON: `{"id": 10001, "randomNumber": 4567}`.

6. **`POST /multiple-create`**
   - Request body: `{"r": [4567, 1234, 8901, ...]}`
   - Inserts multiple new rows into the `Temp` table, one for each value in `r`.
   - Returns the newly created JSON array of rows.

#### Update — `PUT`

7. **`PUT /single-update`**
   - Request body: `{"id": 123, "randomNumber": 4567}`
   - Fetches the row with the given `id` from `World`, updates its `randomNumber` to the given value, and returns the updated row.

8. **`PUT /multiple-update`**
   - Request body: `{"ids": [42, 891, 3412, ...], "r": [5812, 2231, 9901, ...]}`
   - Fetches the rows whose `id` values match `ids`, updates each row's `randomNumber` using the corresponding value from `r` (matched positionally).
   - Returns the updated JSON array of rows.

### Database Schema

The provided database (PostgreSQL or MSSQL) will automatically be seeded with two tables:

```sql
-- Stable dataset used for read and update tests (10,000 rows, never modified by delete/create tests)
CREATE TABLE World (
  id INT PRIMARY KEY,
  randomNumber INT NOT NULL
);

-- Scratch table used exclusively for create and delete tests (seeded with 10,000 rows)
CREATE TABLE Temp (
  id INT PRIMARY KEY AUTOINCREMENT,
  randomNumber INT NOT NULL
);
```

> **Why two tables?** The `World` table is a fixed dataset used by read and update benchmarks. Using it for delete tests would eventually exhaust the rows and cause failures. The `Temp` table is a dedicated scratch space for create/delete operations — its rows will be continuously inserted and deleted during those test phases.
