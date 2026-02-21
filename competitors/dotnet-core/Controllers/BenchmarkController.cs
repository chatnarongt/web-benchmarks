using Microsoft.AspNetCore.Mvc;

namespace DotnetCore.Controllers;

[ApiController]
public class BenchmarkController : ControllerBase
{
    private readonly Db _db;

    public BenchmarkController(Db db)
    {
        _db = db;
    }

    [HttpGet("/plaintext")]
    public string GetPlaintext() => "Hello World!";

    [HttpGet("/json")]
    public object GetJson() => new { message = "Hello World!" };

    [HttpGet("/database/single-read")]
    public async Task<IActionResult> GetSingleRead()
    {
        var world = await _db.LoadSingleQueryRow();
        return world != null ? Ok(world) : NotFound();
    }

    [HttpGet("/database/multiple-read")]
    public async Task<IActionResult> GetMultipleRead()
    {
        var results = await _db.LoadMultipleQueriesRows();
        return Ok(results);
    }
}
