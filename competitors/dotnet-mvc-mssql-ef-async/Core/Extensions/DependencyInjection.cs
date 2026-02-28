using Core.Modules.Benchmark.UseCases;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Extensions;

public static class DependencyInjectionExtensions
{
    public static WebApplicationBuilder AddDependencyInjection(this WebApplicationBuilder builder)
    {
        builder.Services.AddDbContext<BenchmarkContext>(options =>
        {
            options.UseSqlServer(builder.Configuration.GetConnectionString("BenchmarkDatabase"));
        });

        /*
        * AddSingleton — Should be reserved for services that are stateless or
        * hold global state that must be shared across every user and every request
        * in your application.
        * ```
        * builder.Services.AddSingleton<TService>();
        * ```
        */

        /*
        * AddScoped — Is your "bread and butter." You should use it for any service
        * that needs to maintain state or perform operations specific to a single user's request,
        * but should be shared across different classes during that same request.
        * ```
        * builder.Services.AddScoped<TService>();
        * ```
        */
        builder.Services.AddScoped<IGetPlaintextUseCase, GetPlaintextUseCase>();
        builder.Services.AddScoped<IGetJsonUseCase, GetJsonUseCase>();
        builder.Services.AddScoped<IReadOneUseCase, ReadOneUseCase>();
        builder.Services.AddScoped<IReadManyUseCase, ReadManyUseCase>();
        builder.Services.AddScoped<ICreateOneUseCase, CreateOneUseCase>();
        builder.Services.AddScoped<ICreateManyUseCase, CreateManyUseCase>();
        builder.Services.AddScoped<IUpdateOneUseCase, UpdateOneUseCase>();
        builder.Services.AddScoped<IUpdateManyUseCase, UpdateManyUseCase>();
        builder.Services.AddScoped<IDeleteOneUseCase, DeleteOneUseCase>();
        builder.Services.AddScoped<IDeleteManyUseCase, DeleteManyUseCase>();

        return builder;
    }
}
