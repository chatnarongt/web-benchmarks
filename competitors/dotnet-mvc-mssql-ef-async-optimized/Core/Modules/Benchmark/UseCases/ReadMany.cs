using Core.Models;
using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IReadManyUseCase
{
    ReadManyResponse Execute(ReadManyQuery request);

    Task<ReadManyResponse> ExecuteAsync(ReadManyQuery request);
}

public class ReadManyUseCase(BenchmarkContext db) : IReadManyUseCase
{
    public ReadManyResponse Execute(ReadManyQuery request)
    {
        var items = db
            .World.AsNoTracking()
            .OrderBy(w => w.Id)
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(w => new WorldAnnotated { Id = w.Id, RandomNumber = w.RandomNumber })
            .ToList();

        return new() { Items = items };
    }

    public async Task<ReadManyResponse> ExecuteAsync(ReadManyQuery request)
    {
        // Materialize the list asynchronously to free up the thread during I/O
        var items = await db
            .World.AsNoTracking()
            .OrderBy(w => w.Id)
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(w => new WorldAnnotated { Id = w.Id, RandomNumber = w.RandomNumber })
            .ToListAsync(); // Use Task-based materialization

        return new() { Items = items };
    }
}
