using Core.Modules.Benchmark.Models;
using Database.Benchmark;

namespace Core.Modules.Benchmark.UseCases;

public interface ICreateManyUseCase
{
    Task<CreateManyResponse> ExecuteAsync(CreateManyRequestBody request);
}

public class CreateManyUseCase(BenchmarkContext db) : ICreateManyUseCase
{
    public async Task<CreateManyResponse> ExecuteAsync(CreateManyRequestBody request)
    {
        // 1. Pre-allocate list capacity to avoid resizing
        // Prevents the internal array from being copied as it grows.
        var count = request.Items.Count;
        var temps = new List<Temp>(count);

        foreach (var item in request.Items)
        {
            temps.Add(new() { RandomNumber = item.RandomNumber });
        }

        // 2. Optimization: Disable Change Tracking for this bulk operation
        // Prevents EF Core from scanning the whole list every time a new item is added.
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            db.Temps.AddRange(temps);
            await db.SaveChangesAsync();
        }
        finally
        {
            // Re-enable Change Tracking after the bulk operation
            db.ChangeTracker.AutoDetectChangesEnabled = true;
        }

        // 3. Map back to response format without additional database query
        var items = new List<CreateOneResponse>(count);
        foreach (var item in temps)
        {
            items.Add(new() { Id = item.Id, RandomNumber = item.RandomNumber });
        }

        return new() { Items = items };
    }
}
