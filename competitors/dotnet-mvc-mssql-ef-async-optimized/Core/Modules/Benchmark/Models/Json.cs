using System.ComponentModel;
using Swashbuckle.AspNetCore.Annotations;

namespace Core.Modules.Benchmark.Models;

[SwaggerSchema(Required = ["Message"])]
public class GetJsonResponse
{
    [SwaggerSchema("The message to be returned in the JSON response.", Nullable = false)]
    [DefaultValue("Hello, World!")]
    public string Message { get; set; } = "Hello, World!";
}
