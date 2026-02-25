using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IReadOneUseCase
{
    Task<ReadOneResponse> ExecuteAsync(ReadOneQuery request);
}

public class ReadOneUseCase(BenchmarkContext db) : IReadOneUseCase
{
    public async Task<ReadOneResponse> ExecuteAsync(ReadOneQuery request)
    {
        // Projection + NoTracking + Async materialization
        return await db
            .Worlds.AsNoTracking()
            .Where(w => w.Id == request.Id)
            .Select(w => new ReadOneResponse { Id = w.Id, RandomNumber = w.RandomNumber })
            .FirstAsync();
    }
}
