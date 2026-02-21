using Dapper;
using Microsoft.Data.SqlClient;
using System.Data.Common;

namespace DotnetMinimalApisMssql;

public class Db
{
    private readonly DbProviderFactory _dbProviderFactory;
    private readonly string _connectionString;

    public Db(string connectionString)
    {
        _dbProviderFactory = SqlClientFactory.Instance;
        _connectionString = connectionString;
    }

    public async Task<object?> LoadSingleQueryRow()
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QuerySingleOrDefaultAsync<object>(
            "SELECT id, randomNumber FROM World WHERE id = @id", new { id = Random.Shared.Next(1, 10001) });
    }

    public async Task<IEnumerable<object>> LoadMultipleQueriesRows()
    {
        int limit = 20;
        int offset = Random.Shared.Next(0, 10001 - limit);
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QueryAsync<object>(
            "SELECT id, randomNumber FROM World ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY",
            new { offset, limit });
    }
}
