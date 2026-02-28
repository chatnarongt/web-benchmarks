namespace Core.Modules.Benchmark.UseCases;

public interface IGetPlaintextUseCase
{
    string Execute();
}

public class GetPlaintextUseCase : IGetPlaintextUseCase
{
    public string Execute()
    {
        return "Hello, World!";
    }
}
