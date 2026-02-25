using Core.Modules.Benchmark.Models;
using Database.Benchmark;

namespace Core.Modules.Benchmark.UseCases;

public interface ICreateOneUseCase
{
    CreateOneResponse Execute(CreateOneRequestBody request);

    Task<CreateOneResponse> ExecuteAsync(CreateOneRequestBody request);
}

public class CreateOneUseCase(BenchmarkContext db) : ICreateOneUseCase
{
    public CreateOneResponse Execute(CreateOneRequestBody request)
    {
        var temp = new Temp { RandomNumber = request.RandomNumber };

        db.Temp.Add(temp);
        db.SaveChanges();

        return new CreateOneResponse { Id = temp.Id, RandomNumber = temp.RandomNumber };
    }

    public async Task<CreateOneResponse> ExecuteAsync(CreateOneRequestBody request)
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

        return new CreateOneResponse { Id = temp.Id, RandomNumber = temp.RandomNumber };
    }
}
