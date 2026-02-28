using System.ComponentModel.DataAnnotations;
using Swashbuckle.AspNetCore.Annotations;

namespace Core.Modules.Benchmark.Models;

public class DeleteOneParams
{
    [Required]
    [SwaggerSchema("The ID of the record to delete.")]
    public int Id { get; set; }
}
