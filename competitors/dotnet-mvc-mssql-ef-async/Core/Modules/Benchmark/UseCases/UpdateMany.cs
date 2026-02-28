using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IUpdateManyUseCase
{
    void Execute(UpdateManyRequestBody request);

    Task ExecuteAsync(UpdateManyRequestBody request);
}

public class UpdateManyUseCase(BenchmarkContext db) : IUpdateManyUseCase
{
    public void Execute(UpdateManyRequestBody request)
    {
        var worlds = db.World.Where(w => request.Items.Select(i => i.Id).Contains(w.Id)).ToList();

        foreach (var item in request.Items)
        {
            var world = worlds.FirstOrDefault(w => w.Id == item.Id);
            world?.RandomNumber = item.RandomNumber;
        }

        db.SaveChanges();
    }

    public async Task ExecuteAsync(UpdateManyRequestBody request)
    {
        var worlds = await db
            .World.Where(w => request.Items.Select(i => i.Id).Contains(w.Id))
            .ToListAsync();

        foreach (var item in request.Items)
        {
            var world = worlds.FirstOrDefault(w => w.Id == item.Id);
            world?.RandomNumber = item.RandomNumber;
        }

        await db.SaveChangesAsync();
    }
}
