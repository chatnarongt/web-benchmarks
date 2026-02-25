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
    IUpdateManyUseCase updateMany
) : ControllerBase
{
    [HttpGet("plaintext")]
    [SwaggerOperation(
        Summary = "Get Plaintext",
        Description = "Returns a plaintext response with the message 'Hello, World!'.",
        OperationId = "GetPlaintext"
    )]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/plain")]
    public string GetPlaintext()
    {
        return getPlaintext.Execute();
    }

    [HttpGet("json-serialization")]
    [SwaggerOperation(
        Summary = "Get JSON",
        Description = "Returns a JSON response with the message 'Hello, World!'.",
        OperationId = "GetJson"
    )]
    [ProducesResponseType(typeof(GetJsonResponse), StatusCodes.Status200OK, "application/json")]
    public GetJsonResponse GetJson()
    {
        return getJson.Execute();
    }

    [HttpGet("read-one")]
    [SwaggerOperation(
        Summary = "Get Single Read",
        Description = "Returns a JSON response with a single record from the 'World' table based on the provided 'Id' query parameter.",
        OperationId = "ReadOne"
    )]
    [ProducesResponseType(typeof(ReadOneResponse), StatusCodes.Status200OK, "application/json")]
    public Task<ReadOneResponse> ReadOne([FromQuery] ReadOneQuery query)
    {
        return getSingleRead.ExecuteAsync(query);
    }

    [HttpGet("read-many")]
    [SwaggerOperation(
        Summary = "Get Multiple Read",
        Description = "Returns a JSON array of records from the 'World' table using LIMIT and OFFSET.",
        OperationId = "ReadMany"
    )]
    [ProducesResponseType(typeof(ReadManyResponse), StatusCodes.Status200OK, "application/json")]
    public Task<ReadManyResponse> ReadMany([FromQuery] ReadManyQuery request)
    {
        return getMultipleRead.ExecuteAsync(request);
    }

    [HttpPost("create-one")]
    [SwaggerOperation(
        Summary = "Create One",
        Description = "Creates a new record in the 'Temp' table with a random number.",
        OperationId = "CreateOne"
    )]
    [ProducesResponseType(typeof(CreateOneResponse), StatusCodes.Status200OK, "application/json")]
    public Task<CreateOneResponse> CreateOne([FromBody] CreateOneRequestBody request)
    {
        return createOne.ExecuteAsync(request);
    }

    [HttpPost("create-many")]
    [SwaggerOperation(
        Summary = "Create Many",
        Description = "Creates multiple new records in the 'Temp' table with random numbers.",
        OperationId = "CreateMany"
    )]
    [ProducesResponseType(typeof(CreateManyResponse), StatusCodes.Status200OK, "application/json")]
    public Task<CreateManyResponse> CreateMany([FromBody] CreateManyRequestBody request)
    {
        return createMany.ExecuteAsync(request);
    }

    [HttpPatch("update-one/{id:int}")]
    [SwaggerOperation(
        Summary = "Update One",
        Description = "Updates a single record in the 'World' table with a random number.",
        OperationId = "UpdateOne"
    )]
    [ProducesResponseType(typeof(UpdateOneResponse), StatusCodes.Status200OK, "application/json")]
    public Task<UpdateOneResponse> UpdateOne(
        [FromRoute] UpdateOneParams query,
        [FromBody] UpdateOneRequestBody request
    )
    {
        return updateOne.ExecuteAsync(query, request);
    }

    [HttpPut("update-many")]
    [SwaggerOperation(
        Summary = "Update Many",
        Description = "Updates multiple records in the 'World' table with random numbers.",
        OperationId = "UpdateMany"
    )]
    [ProducesResponseType(typeof(UpdateManyResponse), StatusCodes.Status200OK, "application/json")]
    public Task<UpdateManyResponse> UpdateMany([FromBody] UpdateManyRequestBody request)
    {
        return updateMany.ExecuteAsync(request);
    }
}
