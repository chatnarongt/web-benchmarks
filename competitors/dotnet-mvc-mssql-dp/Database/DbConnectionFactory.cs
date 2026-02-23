using Microsoft.Data.SqlClient;
using System.Data;

namespace Database;

/// <summary>
/// Provides an open IDbConnection backed by SQL Server.
/// Register as Scoped so one connection is reused per request.
/// </summary>
public class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory()
    {
        _connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? throw new InvalidOperationException("DATABASE_URL environment variable is not set.");
    }

    public IDbConnection CreateConnection()
    {
        var conn = new SqlConnection(_connectionString);
        conn.Open();
        return conn;
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
