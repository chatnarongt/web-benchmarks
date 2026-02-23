using Core.Modules.Benchmark.Models;
using Core.Modules.Benchmark.Services;
using Database;
using Microsoft.AspNetCore.Mvc;

namespace Core.Modules.Benchmark;

[ApiController]
[Route("")]
public class BenchmarkController(
    IGetPlaintextService getPlaintextService,
    IGetJsonService getJsonService,
    ISingleReadService singleReadService,
    IMultipleReadService multipleReadService,
    ISingleCreateService singleCreateService,
    IMultipleCreateService multipleCreateService,
    ISingleUpdateService singleUpdateService,
    IMultipleUpdateService multipleUpdateService,
    ISingleDeleteService singleDeleteService,
    IMultipleDeleteService multipleDeleteService
) : ControllerBase
{
    // ── Plaintext / JSON ─────────────────────────────────────────────────────

    [HttpGet("plaintext")]
    public IActionResult GetPlaintext() => Ok(getPlaintextService.Execute());

    [HttpGet("json")]
    public IActionResult GetJson() => Ok(getJsonService.Execute());

    // ── Read ─────────────────────────────────────────────────────────────────

    [HttpGet("single-read")]
    public IActionResult SingleRead([FromQuery] int id) => Ok(singleReadService.Execute(id));

    [HttpGet("multiple-read")]
    public IActionResult MultipleRead([FromQuery] string ids)
    {
        var idList = ids.Split(',').Select(int.Parse).ToList();
        return Ok(multipleReadService.Execute(idList));
    }

    // ── Create ───────────────────────────────────────────────────────────────

    [HttpPost("single-create")]
    public IActionResult SingleCreate([FromBody] SingleCreateRequest body) =>
        Ok(singleCreateService.Execute(body.RandomNumber));

    [HttpPost("multiple-create")]
    public IActionResult MultipleCreate([FromBody] MultipleCreateRequest body) =>
        Ok(multipleCreateService.Execute(body.R));

    // ── Update ───────────────────────────────────────────────────────────────

    [HttpPut("single-update")]
    public IActionResult SingleUpdate([FromBody] SingleUpdateRequest body) =>
        Ok(singleUpdateService.Execute(body.Id, body.RandomNumber));

    [HttpPut("multiple-update")]
    public IActionResult MultipleUpdate([FromBody] MultipleUpdateRequest body) =>
        Ok(multipleUpdateService.Execute(body.Ids, body.R));

    // ── Delete ───────────────────────────────────────────────────────────────

    [HttpDelete("single-delete")]
    public IActionResult SingleDelete([FromQuery] int id) => Ok(singleDeleteService.Execute(id));

    [HttpDelete("multiple-delete")]
    public IActionResult MultipleDelete([FromQuery] string ids)
    {
        var idList = ids.Split(',').Select(int.Parse).ToList();
        return Ok(multipleDeleteService.Execute(idList));
    }
}
