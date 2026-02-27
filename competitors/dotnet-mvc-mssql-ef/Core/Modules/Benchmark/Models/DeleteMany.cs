using System.ComponentModel.DataAnnotations;

namespace Core.Modules.Benchmark.Models;

public class DeleteManyRequestBody
{
    [Required]
    public List<int> Ids { get; set; } = [];
}
