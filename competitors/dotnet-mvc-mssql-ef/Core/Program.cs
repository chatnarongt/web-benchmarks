using Microsoft.OpenApi;

namespace Core;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddControllers();
        builder.Services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc(
                "v1",
                new OpenApiInfo
                {
                    Title = "Web API",
                    Version = "1.0.0",
                    Description = "A simple web API for benchmarking purposes.",
                }
            );
        });

        // Infrastructure — single DbContext instance, services share it

        // Services — each service opens and closes its own connection per call

        var app = builder.Build();
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "Web API v1");
                options.RoutePrefix = string.Empty;
            });
        }

        app.MapControllers();
        app.Run();
    }
}
