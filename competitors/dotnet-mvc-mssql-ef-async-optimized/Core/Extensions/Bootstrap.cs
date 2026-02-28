using System.Text.Json;

namespace Core.Extensions;

public static class BootstrapExtensions
{
    public static WebApplicationBuilder Bootstrap(this WebApplicationBuilder builder)
    {
        builder
            .Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            });
        return builder;
    }
}
