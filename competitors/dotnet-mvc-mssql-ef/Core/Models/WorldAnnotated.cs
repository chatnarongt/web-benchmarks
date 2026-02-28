using Swashbuckle.AspNetCore.Annotations;

namespace Core.Models;

public class WorldAnnotated
{
    [SwaggerSchema("The ID of the World record.")]
    public int Id { get; set; }

    [SwaggerSchema("The random number associated with the World record.")]
    public int RandomNumber { get; set; }
}
