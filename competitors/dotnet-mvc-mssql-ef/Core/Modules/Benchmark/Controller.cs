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
    ICreateManyUseCase createMany
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

    [HttpGet("json")]
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
    public ReadOneResponse ReadOne([FromQuery] ReadOneQuery query)
    {
        return getSingleRead.Execute(query);
    }

    [HttpGet("read-many")]
    [SwaggerOperation(
        Summary = "Get Multiple Read",
        Description = "Returns a JSON array of records from the 'World' table using LIMIT and OFFSET.",
        OperationId = "ReadMany"
    )]
    [ProducesResponseType(
        typeof(Task<ReadManyResponse>),
        StatusCodes.Status200OK,
        "application/json"
    )]
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
    public CreateOneResponse CreateOne([FromBody] CreateOneRequestBody request)
    {
        return createOne.Execute(request);
    }

    [HttpPost("create-many")]
    [SwaggerOperation(
        Summary = "Create Many",
        Description = "Creates multiple new records in the 'Temp' table with random numbers.",
        OperationId = "CreateMany"
    )]
    [ProducesResponseType(
        typeof(Task<CreateManyResponse>),
        StatusCodes.Status200OK,
        "application/json"
    )]
    public Task<CreateManyResponse> CreateMany([FromBody] CreateManyRequestBody request)
    {
        return createMany.ExecuteAsync(request);
    }
}
