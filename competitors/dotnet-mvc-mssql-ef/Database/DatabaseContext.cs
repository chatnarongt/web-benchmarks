using Microsoft.EntityFrameworkCore;

namespace Database;

public class DatabaseContext : DbContext
{
    public DbSet<World> World { get; set; }
    public DbSet<Temp> Temp { get; set; }

    private readonly string _connectionString;

    public DatabaseContext()
    {
        string? connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("DATABASE_URL environment variable is not set.");
        }

        _connectionString = connectionString;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseSqlServer(_connectionString);
    }
}

public class World
{
    public int Id { get; set; }
    public int RandomNumber { get; set; }
}

public class Temp
{
    public int Id { get; set; }
    public int RandomNumber { get; set; }
}
