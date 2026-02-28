using Core.Extensions;

namespace Core;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Bootstrap();
        builder.AddDocumentation();
        builder.AddDependencyInjection();

        var app = builder.Build();
        app.UseDocumentation();
        app.MapControllers();
        app.Run();
    }
}
