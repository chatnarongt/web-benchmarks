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

    public async Task<World?> SingleWriteRow()
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;

        var world = await db.QuerySingleOrDefaultAsync<World>(
            "SELECT id, randomNumber FROM World WHERE id = @id", new { id = Random.Shared.Next(1, 10001) });

        if (world != null)
        {
            var newRandomNumber = Random.Shared.Next(1, 10001);
            await db.ExecuteAsync(
                "UPDATE World SET randomNumber = @randomNumber WHERE id = @id",
                new { randomNumber = newRandomNumber, id = world.Id });
            return world with { RandomNumber = newRandomNumber };
        }

        return null;
    }

    public async Task<IEnumerable<World>> MultipleWriteRows()
    {
        int limit = 20;
        int offset = Random.Shared.Next(0, 10001 - limit);
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;

        var worlds = (await db.QueryAsync<World>(
            "SELECT id, randomNumber FROM World ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY",
            new { offset, limit })).ToList();

        if (worlds.Count == 0) return worlds;

        var sql = new System.Text.StringBuilder("UPDATE w SET randomNumber = temp.rn FROM World w INNER JOIN (VALUES ");

        for (int i = 0; i < worlds.Count; i++)
        {
            var newRandomNumber = Random.Shared.Next(1, 10001);
            worlds[i] = worlds[i] with { RandomNumber = newRandomNumber };

            sql.Append($"({worlds[i].Id}, {newRandomNumber})");
            if (i < worlds.Count - 1) sql.Append(", ");
        }
        sql.Append(") AS temp(id, rn) ON w.id = temp.id");

        await db.ExecuteAsync(sql.ToString());

        return worlds;
    }
}

public record World(int Id, int RandomNumber);
