using System.ComponentModel.DataAnnotations;
using Core.Attributes;
using Core.Models;

namespace Core.Modules.Benchmark.Models;

public class UpdateItem : WorldAnnotated
{
    [Range(1, 10000)]
    [Required]
    public new int Id { get; set; }

    [Range(1, 10000)]
    [Required]
    public new int RandomNumber { get; set; }
}

public class UpdateManyRequestBody
{
    [UniqueBy(nameof(UpdateItem.Id))]
    public List<UpdateItem> Items { get; set; } = [];
}

public class UpdateManyResponse
{
    public List<UpdateItem> Items { get; set; } = [];
}
