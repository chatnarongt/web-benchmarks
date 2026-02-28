namespace Core.Modules.Benchmark.Models;

public class CreateManyRequestBody
{
    public List<CreateOneRequestBody> Items { get; set; } = [];
};
