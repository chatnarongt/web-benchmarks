namespace Core.Modules.Benchmark.Services;

public interface IGetPlaintextService
{
    string Execute();
}

public class GetPlaintextService : IGetPlaintextService
{
    public string Execute()
    {
        return "Hello, World!";
    }
}
