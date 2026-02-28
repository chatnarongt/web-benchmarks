using System.ComponentModel.DataAnnotations;
using Core.Models;
using Swashbuckle.AspNetCore.Annotations;

namespace Core.Modules.Benchmark.Models;

public class ReadOneQuery
{
    [Required]
    [Range(1, 10000)]
    [SwaggerSchema("The ID of the World record to be retrieved.")]
    public int Id { get; set; }
}

public class ReadOneResponse : WorldAnnotated;
