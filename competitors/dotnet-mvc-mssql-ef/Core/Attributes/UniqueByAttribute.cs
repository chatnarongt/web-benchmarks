using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace Core.Attributes;

[AttributeUsage(AttributeTargets.Property)]
public class UniqueByAttribute(string propertyName) : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not IEnumerable list)
        {
            return ValidationResult.Success;
        }

        var seen = new HashSet<object>();
        foreach (var item in list)
        {
            if (item == null)
                continue;

            var property = item.GetType().GetProperty(propertyName);
            if (property == null)
            {
                throw new ArgumentException(
                    $"Property '{propertyName}' not found on type '{item.GetType().Name}'"
                );
            }

            var propValue = property.GetValue(item);
            if (propValue != null && !seen.Add(propValue))
            {
                return new ValidationResult(
                    ErrorMessage ?? $"Duplicate value found for '{propertyName}': {propValue}",
                    [validationContext.MemberName!]
                );
            }
        }

        return ValidationResult.Success;
    }
}
