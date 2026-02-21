using DotnetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

string connectionString = "Host=postgres-service;Database=benchmark;Username=postgres;Password=benchmark;Minimum Pool Size=100;Maximum Pool Size=100;";
builder.Services.AddScoped(_ => new Db(connectionString));

var app = builder.Build();

app.MapControllers();

app.Run("http://0.0.0.0:3000");
