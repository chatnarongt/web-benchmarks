using Core.Models;
using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IReadManyUseCase
{
    Task<ReadManyResponse> ExecuteAsync(ReadManyQuery request);
}

public class ReadManyUseCase(BenchmarkContext db) : IReadManyUseCase
{
    public async Task<ReadManyResponse> ExecuteAsync(ReadManyQuery request)
    {
        // Materialize the list asynchronously to free up the thread during I/O
        var items = await db
            .Worlds.AsNoTracking()
            .OrderBy(w => w.Id)
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(w => new WorldAnnotated { Id = w.Id, RandomNumber = w.RandomNumber })
            .ToListAsync(); // Use Task-based materialization

        return new() { Items = items };
    }
}
