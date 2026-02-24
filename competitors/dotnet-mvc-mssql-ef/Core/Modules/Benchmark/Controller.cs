using Microsoft.AspNetCore.Mvc;

namespace Core.Modules.Benchmark;

[ApiController]
[Route("")]
public class BenchmarkController() : ControllerBase
{
    [HttpGet("plaintext")]
    public string GetPlaintext()
    {
        return "Hello World!";
    }
}
