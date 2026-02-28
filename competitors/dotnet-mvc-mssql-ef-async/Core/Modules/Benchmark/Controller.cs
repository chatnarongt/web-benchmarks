using Core.Modules.Benchmark.Models;
using Core.Modules.Benchmark.UseCases;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Core.Modules.Benchmark;

[ApiController]
[Route("")]
public class BenchmarkController(
    IGetPlaintextUseCase getPlaintext,
    IGetJsonUseCase getJson,
    IReadOneUseCase getSingleRead,
    IReadManyUseCase getMultipleRead,
    ICreateOneUseCase createOne,
    ICreateManyUseCase createMany,
    IUpdateOneUseCase updateOne,
    IUpdateManyUseCase updateMany,
    IDeleteOneUseCase deleteOne,
    IDeleteManyUseCase deleteMany
) : ControllerBase
{
    [HttpGet("plaintext")]
    [SwaggerOperation(
        Summary = "Get Plaintext",
        Description = "Returns a plaintext response with the message 'Hello, World!'.",
        OperationId = "GetPlaintext"
    )]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/plain")]
    public IActionResult GetPlaintext()
    {
        return Ok(getPlaintext.Execute());
    }

    [HttpGet("json-serialization")]
    [SwaggerOperation(
        Summary = "Get JSON",
        Description = "Returns a JSON response with the message 'Hello, World!'.",
        OperationId = "GetJson"
    )]
    [ProducesResponseType(typeof(GetJsonResponse), StatusCodes.Status200OK, "application/json")]
    public IActionResult GetJson()
    {
        return Ok(getJson.Execute());
    }

    [HttpGet("read-one")]
    [SwaggerOperation(
        Summary = "Get Single Read",
        Description = "Returns a JSON response with a single record from the 'World' table based on the provided 'Id' query parameter.",
        OperationId = "ReadOne"
    )]
    [ProducesResponseType(typeof(ReadOneResponse), StatusCodes.Status200OK, "application/json")]
    public async Task<IActionResult> ReadOne([FromQuery] ReadOneQuery query)
    {
        return Ok(await getSingleRead.ExecuteAsync(query));
    }

    [HttpGet("read-many")]
    [SwaggerOperation(
        Summary = "Get Multiple Read",
        Description = "Returns a JSON array of records from the 'World' table using LIMIT and OFFSET.",
        OperationId = "ReadMany"
    )]
    [ProducesResponseType(
        typeof(List<ReadOneResponse>),
        StatusCodes.Status200OK,
        "application/json"
    )]
    public async Task<IActionResult> ReadMany([FromQuery] ReadManyQuery request)
    {
        return Ok(await getMultipleRead.ExecuteAsync(request));
    }

    [HttpPost("create-one")]
    [SwaggerOperation(
        Summary = "Create One",
        Description = "Creates a new record in the 'Temp' table with a random number.",
        OperationId = "CreateOne"
    )]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateOne([FromBody] CreateOneRequestBody request)
    {
        await createOne.ExecuteAsync(request);
        return Created();
    }

    [HttpPost("create-many")]
    [SwaggerOperation(
        Summary = "Create Many",
        Description = "Creates multiple new records in the 'Temp' table with random numbers.",
        OperationId = "CreateMany"
    )]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateMany([FromBody] CreateManyRequestBody request)
    {
        await createMany.ExecuteAsync(request);
        return Created();
    }

    [HttpPatch("update-one/{id:int}")]
    [SwaggerOperation(
        Summary = "Update One",
        Description = "Updates a single record in the 'World' table with a random number.",
        OperationId = "UpdateOne"
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateOne(
        [FromRoute] UpdateOneParams query,
        [FromBody] UpdateOneRequestBody request
    )
    {
        await updateOne.ExecuteAsync(query, request);
        return Ok();
    }

    [HttpPut("update-many")]
    [SwaggerOperation(
        Summary = "Update Many",
        Description = "Updates multiple records in the 'World' table with random numbers.",
        OperationId = "UpdateMany"
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMany([FromBody] UpdateManyRequestBody request)
    {
        await updateMany.ExecuteAsync(request);
        return Ok();
    }

    [HttpDelete("delete-one/{id:int}")]
    [SwaggerOperation(
        Summary = "Delete One",
        Description = "Deletes a single record from the 'Temp' table by ID.",
        OperationId = "DeleteOne"
    )]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteOne([FromRoute] DeleteOneParams query)
    {
        await deleteOne.ExecuteAsync(query);
        return NoContent();
    }

    [HttpDelete("delete-many")]
    [SwaggerOperation(
        Summary = "Delete Many",
        Description = "Deletes multiple records from the 'Temp' table by IDs.",
        OperationId = "DeleteMany"
    )]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteMany([FromBody] DeleteManyRequestBody request)
    {
        await deleteMany.ExecuteAsync(request);
        return NoContent();
    }
}
