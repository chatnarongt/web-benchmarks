using System.Reflection;
using Microsoft.OpenApi;

namespace Core.Extensions;

public static class DocumentationExtensions
{
    public static WebApplicationBuilder AddDocumentation(this WebApplicationBuilder builder)
    {
        builder.Services.AddSwaggerGen(options =>
        {
            var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            options.IncludeXmlComments(xmlPath);
            options.DescribeAllParametersInCamelCase();
            options.EnableAnnotations();
            options.UseAllOfForInheritance();
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

        return builder;
    }

    public static WebApplication UseDocumentation(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger(options =>
            {
                options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1;
                options.RouteTemplate = "swagger/{documentName}/swagger.json";
            });
            app.UseSwaggerUI(options =>
            {
                options.RoutePrefix = "docs";
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "Web API v1");
            });
        }

        return app;
    }
}
