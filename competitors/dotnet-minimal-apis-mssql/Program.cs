using DotnetMinimalApisMssql;

var builder = WebApplication.CreateBuilder(args);

string benchmarkConnectionString = "Server=mssql-service;Database=benchmark;User Id=sa;Password=Benchmark123!;Encrypt=False;TrustServerCertificate=True;Connection Timeout=30;Min Pool Size=1;Max Pool Size=100;";
builder.Services.AddScoped(_ => new Db(benchmarkConnectionString));

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
