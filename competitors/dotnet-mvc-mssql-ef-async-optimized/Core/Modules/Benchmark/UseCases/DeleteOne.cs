using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IDeleteOneUseCase
{
    void Execute(DeleteOneParams query);

    Task ExecuteAsync(DeleteOneParams query);
}

public class DeleteOneUseCase(BenchmarkContext db) : IDeleteOneUseCase
{
    public void Execute(DeleteOneParams query)
    {
        db.Temp.Where(t => t.Id == query.Id).ExecuteDelete();
    }

    public async Task ExecuteAsync(DeleteOneParams query)
    {
        await db.Temp.Where(t => t.Id == query.Id).ExecuteDeleteAsync();
    }
}
