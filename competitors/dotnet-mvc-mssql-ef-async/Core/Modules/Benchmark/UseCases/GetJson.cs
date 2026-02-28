using Core.Modules.Benchmark.Models;

namespace Core.Modules.Benchmark.UseCases;

public interface IGetJsonUseCase
{
    GetJsonResponse Execute();
}

public class GetJsonUseCase : IGetJsonUseCase
{
    public GetJsonResponse Execute()
    {
        return new GetJsonResponse();
    }
}
