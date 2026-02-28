using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IUpdateOneUseCase
{
    void Execute(UpdateOneParams query, UpdateOneRequestBody request);

    Task ExecuteAsync(UpdateOneParams query, UpdateOneRequestBody request);
}

public class UpdateOneUseCase(BenchmarkContext db) : IUpdateOneUseCase
{
    public void Execute(UpdateOneParams query, UpdateOneRequestBody request)
    {
        var world = db.World.First(w => w.Id == query.Id);
        world.RandomNumber = request.RandomNumber;
        db.SaveChanges();
    }

    public async Task ExecuteAsync(UpdateOneParams query, UpdateOneRequestBody request)
    {
        var world = await db.World.FirstAsync(w => w.Id == query.Id);
        world.RandomNumber = request.RandomNumber;
        await db.SaveChangesAsync();
    }
}
