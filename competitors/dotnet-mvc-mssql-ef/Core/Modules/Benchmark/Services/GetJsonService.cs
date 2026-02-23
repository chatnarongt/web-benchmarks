using Core.Modules.Benchmark.Models;

namespace Core.Modules.Benchmark.Services;

public interface IGetJsonService
{
    GetJsonResponse Execute();
}

public class GetJsonService : IGetJsonService
{
    public GetJsonResponse Execute()
    {
        return new GetJsonResponse { Message = "Hello, World!" };
    }
}
