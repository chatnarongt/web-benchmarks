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
    public async Task<IActionResult> GetSingleRead([FromQuery] int id = 1)
    {
        var world = await _db.LoadSingleQueryRow(id);
        return world != null ? Ok(world) : NotFound();
    }

    [HttpGet("/database/multiple-read")]
    public async Task<IActionResult> GetMultipleRead([FromQuery] int limit = 20, [FromQuery] int offset = 0)
    {
        var results = await _db.LoadMultipleQueriesRows(limit, offset);
        return Ok(results);
    }

    [HttpGet("/database/single-write")]
    public async Task<IActionResult> GetSingleWrite([FromQuery] int id = 1, [FromQuery] int randomNumber = 1)
    {
        var world = await _db.SingleWriteRow(id, randomNumber);
        return world != null ? Ok(world) : NotFound();
    }

    [HttpGet("/database/multiple-write")]
    public async Task<IActionResult> GetMultipleWrite([FromQuery] int limit = 20, [FromQuery] int offset = 0, [FromQuery] string r = "")
    {
        var rns = string.IsNullOrEmpty(r) ? Array.Empty<int>() : r.Split(',').Select(val => int.TryParse(val, out var parsed) ? parsed : 1).ToArray();
        var results = await _db.MultipleWriteRows(limit, offset, rns);
        return Ok(results);
    }
}
