using System.ComponentModel.DataAnnotations;
using Core.Models;
using Swashbuckle.AspNetCore.Annotations;

namespace Core.Modules.Benchmark.Models;

public class CreateOneRequestBody
{
    [Range(1, 10000)]
    [Required]
    [SwaggerSchema("A random number between 1 and 10,000.")]
    public int RandomNumber { get; set; }
}
