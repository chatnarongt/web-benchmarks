using Core.Modules.Benchmark.Models;
using Database.Benchmark;

namespace Core.Modules.Benchmark.UseCases;

public interface ICreateManyUseCase
{
    void Execute(CreateManyRequestBody request);

    Task ExecuteAsync(CreateManyRequestBody request);
}

public class CreateManyUseCase(BenchmarkContext db) : ICreateManyUseCase
{
    public void Execute(CreateManyRequestBody request)
    {
        var temps = new List<Temp>(request.Items.Count);

        foreach (var item in request.Items)
        {
            temps.Add(new() { RandomNumber = item.RandomNumber });
        }

        db.Temp.AddRange(temps);
        db.SaveChanges();
    }

    public async Task ExecuteAsync(CreateManyRequestBody request)
    {
        // 1. Pre-allocate list capacity to avoid resizing
        // Prevents the internal array from being copied as it grows.
        var temps = new List<Temp>(request.Items.Count);

        foreach (var item in request.Items)
        {
            temps.Add(new() { RandomNumber = item.RandomNumber });
        }

        // 2. Optimization: Disable Change Tracking for this bulk operation
        // Prevents EF Core from scanning the whole list every time a new item is added.
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            db.Temp.AddRange(temps);
            await db.SaveChangesAsync();
        }
        finally
        {
            // Re-enable Change Tracking after the bulk operation
            db.ChangeTracker.AutoDetectChangesEnabled = true;
        }
    }
}
