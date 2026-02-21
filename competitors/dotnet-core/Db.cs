using Dapper;
using Npgsql;
using System.Data.Common;

namespace DotnetCore;

public class Db
{
    private readonly DbProviderFactory _dbProviderFactory;
    private readonly string _connectionString;

    public Db(string connectionString)
    {
        _dbProviderFactory = NpgsqlFactory.Instance;
        _connectionString = connectionString;
    }

    public async Task<World?> LoadSingleQueryRow()
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QuerySingleOrDefaultAsync<World>(
            "SELECT id, randomNumber FROM World WHERE id = @id", new { id = Random.Shared.Next(1, 10001) });
    }

    public async Task<IEnumerable<World>> LoadMultipleQueriesRows()
    {
        int limit = 20;
        int offset = Random.Shared.Next(0, 10001 - limit);
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QueryAsync<World>(
            "SELECT id, randomNumber FROM World ORDER BY id LIMIT @limit OFFSET @offset",
            new { limit, offset });
    }
}

public record World(int Id, int RandomNumber);
