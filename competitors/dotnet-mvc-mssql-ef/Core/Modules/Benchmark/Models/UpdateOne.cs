using System.ComponentModel.DataAnnotations;
using Core.Models;
using Swashbuckle.AspNetCore.Annotations;

namespace Core.Modules.Benchmark.Models;

public class UpdateOneParams
{
    [Range(1, 10000)]
    [Required]
    [SwaggerSchema("The ID of the record to update.")]
    public int Id { get; set; }
}

public class UpdateOneRequestBody
{
    [Range(1, 10000)]
    [Required]
    [SwaggerSchema("The random number to update.")]
    public int RandomNumber { get; set; }
}

public class UpdateOneResponse : WorldAnnotated;
