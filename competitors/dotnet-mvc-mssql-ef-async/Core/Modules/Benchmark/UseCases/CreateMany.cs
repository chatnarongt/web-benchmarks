using Core.Modules.Benchmark.Models;
using Database.Benchmark;

namespace Core.Modules.Benchmark.UseCases;

public interface ICreateManyUseCase
{
    void Execute(CreateManyRequestBody request);

    Task ExecuteAsync(CreateManyRequestBody request);
}

public class CreateManyUseCase(BenchmarkContext db) : ICreateManyUseCase
{
    public void Execute(CreateManyRequestBody request)
    {
        var temps = new List<Temp>();

        foreach (var item in request.Items)
        {
            temps.Add(new() { RandomNumber = item.RandomNumber });
        }

        db.Temp.AddRange(temps);
        db.SaveChanges();
    }

    public async Task ExecuteAsync(CreateManyRequestBody request)
    {
        var temps = new List<Temp>();

        foreach (var item in request.Items)
        {
            temps.Add(new() { RandomNumber = item.RandomNumber });
        }

        db.Temp.AddRange(temps);
        await db.SaveChangesAsync();
    }
}
