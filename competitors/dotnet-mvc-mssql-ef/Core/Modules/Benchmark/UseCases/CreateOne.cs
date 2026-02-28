using Core.Modules.Benchmark.Models;
using Database.Benchmark;

namespace Core.Modules.Benchmark.UseCases;

public interface ICreateOneUseCase
{
    void Execute(CreateOneRequestBody request);

    Task ExecuteAsync(CreateOneRequestBody request);
}

public class CreateOneUseCase(BenchmarkContext db) : ICreateOneUseCase
{
    public void Execute(CreateOneRequestBody request)
    {
        var temp = new Temp { RandomNumber = request.RandomNumber };

        db.Temp.Add(temp);
        db.SaveChanges();
    }

    public async Task ExecuteAsync(CreateOneRequestBody request)
    {
        var temp = new Temp { RandomNumber = request.RandomNumber };

        db.Temp.Add(temp);

        // Optimization: Same as CreateMany - disable change tracking for simple insert
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            await db.SaveChangesAsync();
        }
        finally
        {
            db.ChangeTracker.AutoDetectChangesEnabled = true;
        }
    }
}
