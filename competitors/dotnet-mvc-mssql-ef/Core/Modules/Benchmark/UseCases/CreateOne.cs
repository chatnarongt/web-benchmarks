using Core.Modules.Benchmark.Models;
using Database.Benchmark;

namespace Core.Modules.Benchmark.UseCases;

public interface ICreateOneUseCase
{
    CreateOneResponse Execute(CreateOneRequestBody request);
}

public class CreateOneUseCase(BenchmarkContext db) : ICreateOneUseCase
{
    public CreateOneResponse Execute(CreateOneRequestBody request)
    {
        Temp temp = new() { RandomNumber = request.RandomNumber };
        db.Temps.Add(temp);
        db.SaveChanges();
        return new CreateOneResponse { Id = temp.Id, RandomNumber = temp.RandomNumber };
    }
}
