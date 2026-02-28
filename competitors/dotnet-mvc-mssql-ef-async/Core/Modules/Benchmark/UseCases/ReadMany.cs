using Core.Models;
using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IReadManyUseCase
{
    List<ReadOneResponse> Execute(ReadManyQuery request);

    Task<List<ReadOneResponse>> ExecuteAsync(ReadManyQuery request);
}

public class ReadManyUseCase(BenchmarkContext db) : IReadManyUseCase
{
    public List<ReadOneResponse> Execute(ReadManyQuery request)
    {
        var items = db
            .World.OrderBy(w => w.Id)
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(w => new ReadOneResponse { Id = w.Id, RandomNumber = w.RandomNumber })
            .ToList();

        return items;
    }

    public async Task<List<ReadOneResponse>> ExecuteAsync(ReadManyQuery request)
    {
        var items = await db
            .World.OrderBy(w => w.Id)
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(w => new ReadOneResponse { Id = w.Id, RandomNumber = w.RandomNumber })
            .ToListAsync();

        return items;
    }
}
