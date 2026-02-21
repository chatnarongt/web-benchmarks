using DotnetCoreMssql;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

string connectionString = "Server=mssql-service;Database=benchmark;User Id=sa;Password=Benchmark123!;Encrypt=False;TrustServerCertificate=True;Connection Timeout=30;Min Pool Size=100;Max Pool Size=100;";
builder.Services.AddScoped(_ => new Db(connectionString));

var app = builder.Build();

app.MapControllers();

app.Run("http://0.0.0.0:3000");
