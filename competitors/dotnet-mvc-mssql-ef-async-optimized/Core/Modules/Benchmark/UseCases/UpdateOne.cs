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
        var rowAffected = db
            .World.Where(w => w.Id == query.Id)
            .ExecuteUpdate(s => s.SetProperty(w => w.RandomNumber, request.RandomNumber));

        if (rowAffected == 0)
        {
            throw new BadHttpRequestException($"World with ID {query.Id} not found.");
        }
    }

    public async Task ExecuteAsync(UpdateOneParams query, UpdateOneRequestBody request)
    {
        var rowAffected = await db
            .World.Where(w => w.Id == query.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(w => w.RandomNumber, request.RandomNumber));

        if (rowAffected == 0)
        {
            throw new BadHttpRequestException($"World with ID {query.Id} not found.");
        }
    }
}
