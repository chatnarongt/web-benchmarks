using Core.Modules.Benchmark.Models;
using Database.Benchmark;

namespace Core.Modules.Benchmark.UseCases;

public interface IReadOneUseCase
{
    ReadOneResponse Execute(ReadOneQuery request);
}

public class ReadOneUseCase(BenchmarkContext db) : IReadOneUseCase
{
    public ReadOneResponse Execute(ReadOneQuery request)
    {
        return new ReadOneResponse
        {
            Id = request.Id,
            RandomNumber = db.Worlds.First(w => w.Id == request.Id).RandomNumber,
        };
    }
}
