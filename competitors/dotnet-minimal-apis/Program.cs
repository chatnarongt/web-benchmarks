using Dapper;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

string connectionString = "Host=postgres-service;Database=benchmark;Username=postgres;Password=benchmark";

app.MapGet("/plaintext", () => "Hello World!");

app.MapGet("/json", () => new { message = "Hello World!" });

app.MapGet("/database/single-read", async () =>
{
    int id = Random.Shared.Next(1, 10001);
    using var connection = new NpgsqlConnection(connectionString);
    var world = await connection.QuerySingleOrDefaultAsync<World>(
        "SELECT id, randomNumber FROM World WHERE id = @id", new { id });

    return world != null ? Results.Ok(world) : Results.NotFound();
});

app.MapGet("/database/multiple-read", async () =>
{
    int limit = 20;
    int offset = Random.Shared.Next(0, 10001 - limit);
    using var connection = new NpgsqlConnection(connectionString);
    var results = await connection.QueryAsync<World>(
        "SELECT id, randomNumber FROM World ORDER BY id LIMIT @limit OFFSET @offset",
        new { limit, offset });

    return Results.Ok(results);
});

app.Run("http://0.0.0.0:3000");

public record World(int Id, int RandomNumber);
