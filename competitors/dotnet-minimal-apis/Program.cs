using DotnetMinimalApis;

var builder = WebApplication.CreateBuilder(args);

string connectionString = "Host=postgres-service;Database=benchmark;Username=postgres;Password=benchmark;Minimum Pool Size=1;Maximum Pool Size=100;";
builder.Services.AddScoped(_ => new Db(connectionString));

var app = builder.Build();

app.MapGet("/plaintext", () => "Hello World!");

app.MapGet("/json", () => new { message = "Hello World!" });

app.MapGet("/database/single-read", async (Db db, int? id) =>
{
    var world = await db.LoadSingleQueryRow(id ?? 1);
    return world != null ? Results.Ok(world) : Results.NotFound();
});

app.MapGet("/database/multiple-read", async (Db db, int? limit, int? offset) =>
{
    var results = await db.LoadMultipleQueriesRows(limit ?? 20, offset ?? 0);
    return Results.Ok(results);
});

app.MapGet("/database/single-write", async (Db db, int? id, int? randomNumber) =>
{
    var world = await db.SingleWriteRow(id ?? 1, randomNumber ?? 1);
    return world != null ? Results.Ok(world) : Results.NotFound();
});

app.MapGet("/database/multiple-write", async (Db db, int? limit, int? offset, string? r) =>
{
    var rns = string.IsNullOrEmpty(r) ? Array.Empty<int>() : r.Split(',').Select(val => int.TryParse(val, out var parsed) ? parsed : 1).ToArray();
    var results = await db.MultipleWriteRows(limit ?? 20, offset ?? 0, rns);
    return Results.Ok(results);
});

app.Run("http://0.0.0.0:3000");
