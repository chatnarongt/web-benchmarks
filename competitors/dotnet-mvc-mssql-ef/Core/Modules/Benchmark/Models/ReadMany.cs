using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using Core.Models;
using Swashbuckle.AspNetCore.Annotations;

namespace Core.Modules.Benchmark.Models;

public class ReadManyQuery
{
    [DefaultValue(0)]
    [Range(0, 9980)]
    [SwaggerSchema("The number of World records to skip before returning results.")]
    public int Offset { get; set; } = 0;

    [DefaultValue(20)]
    [Range(1, 20)]
    [SwaggerSchema("The number of World records to return.")]
    public int Limit { get; set; } = 20;
}

public class ReadManyResponse
{
    [SwaggerSchema("An array of World records returned based on the provided Offset and Limit.")]
    public List<WorldAnnotated> Items { get; set; } = [];
};
