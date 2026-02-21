using DotnetMinimalApis;

var builder = WebApplication.CreateBuilder(args);

string connectionString = "Host=postgres-service;Database=benchmark;Username=postgres;Password=benchmark;Minimum Pool Size=1;Maximum Pool Size=100;";
builder.Services.AddScoped(_ => new Db(connectionString));

var app = builder.Build();

app.MapGet("/plaintext", () => "Hello World!");

app.MapGet("/json", () => new { message = "Hello World!" });

app.MapGet("/database/single-read", async (Db db) =>
{
    var world = await db.LoadSingleQueryRow();
    return world != null ? Results.Ok(world) : Results.NotFound();
});

app.MapGet("/database/multiple-read", async (Db db) =>
{
    var results = await db.LoadMultipleQueriesRows();
    return Results.Ok(results);
});

app.MapGet("/database/single-write", async (Db db) =>
{
    var world = await db.SingleWriteRow();
    return world != null ? Results.Ok(world) : Results.NotFound();
});

app.MapGet("/database/multiple-write", async (Db db) =>
{
    var results = await db.MultipleWriteRows();
    return Results.Ok(results);
});

app.Run("http://0.0.0.0:3000");
