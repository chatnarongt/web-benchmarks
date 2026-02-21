using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

string benchmarkConnectionString = "Server=mssql-service;Database=benchmark;User Id=sa;Password=Benchmark123!;Encrypt=False;TrustServerCertificate=True;Connection Timeout=30;";

app.MapGet("/plaintext", () => "Hello World!");

app.MapGet("/json", () => new { message = "Hello World!" });

app.MapGet("/database/single-read", async () =>
{
    int id = Random.Shared.Next(1, 10001);
    using var connection = new SqlConnection(benchmarkConnectionString);
    await connection.OpenAsync();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = "SELECT id, randomNumber FROM World WHERE id = @id";
    cmd.Parameters.AddWithValue("@id", id);
    using var reader = await cmd.ExecuteReaderAsync();
    if (await reader.ReadAsync())
    {
        return Results.Ok(new { id = reader.GetInt32(0), randomNumber = reader.GetInt32(1) });
    }
    return Results.NotFound();
});

app.MapGet("/database/multiple-read", async () =>
{
    int limit = 20;
    int offset = Random.Shared.Next(0, 10001 - limit);
    using var connection = new SqlConnection(benchmarkConnectionString);
    await connection.OpenAsync();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = "SELECT id, randomNumber FROM World ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    cmd.Parameters.AddWithValue("@offset", offset);
    cmd.Parameters.AddWithValue("@limit", limit);

    var results = new List<object>();
    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        results.Add(new { id = reader.GetInt32(0), randomNumber = reader.GetInt32(1) });
    }
    return Results.Ok(results);
});

app.Run("http://0.0.0.0:3000");
