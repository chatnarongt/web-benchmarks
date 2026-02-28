using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IDeleteManyUseCase
{
    void Execute(DeleteManyRequestBody request);

    Task ExecuteAsync(DeleteManyRequestBody request);
}

public class DeleteManyUseCase(BenchmarkContext db) : IDeleteManyUseCase
{
    public void Execute(DeleteManyRequestBody request)
    {
        db.Temp.Where(t => request.Ids.Contains(t.Id)).ExecuteDelete();
    }

    public async Task ExecuteAsync(DeleteManyRequestBody request)
    {
        await db.Temp.Where(t => request.Ids.Contains(t.Id)).ExecuteDeleteAsync();
    }
}
