using Core.Modules.Benchmark.Models;
using Database.Benchmark;
using Microsoft.EntityFrameworkCore;

namespace Core.Modules.Benchmark.UseCases;

public interface IUpdateManyUseCase
{
    Task<UpdateManyResponse> ExecuteAsync(UpdateManyRequestBody request);
}

public class UpdateManyUseCase(BenchmarkContext db) : IUpdateManyUseCase
{
    public async Task<UpdateManyResponse> ExecuteAsync(UpdateManyRequestBody request)
    {
        var count = request.Items.Count;
        var ids = request.Items.Select(x => x.Id).ToList();

        // 1. Fetch existing records in a single batch
        var worlds = await db.Worlds.Where(w => ids.Contains(w.Id)).ToDictionaryAsync(x => x.Id);

        // 2. Update the records
        foreach (var item in request.Items)
        {
            if (worlds.TryGetValue(item.Id, out var world))
            {
                world.RandomNumber = item.RandomNumber;
            }
        }

        // 3. Batch save the changes
        await db.SaveChangesAsync();

        return new UpdateManyResponse { Items = request.Items };
    }
}
