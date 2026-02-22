using Dapper;
using Microsoft.Data.SqlClient;
using System.Data.Common;

namespace DotnetCoreMssql;

public class Db
{
    private readonly DbProviderFactory _dbProviderFactory;
    private readonly string _connectionString;

    public Db(string connectionString)
    {
        _dbProviderFactory = SqlClientFactory.Instance;
        _connectionString = connectionString;
    }

    public async Task<object?> LoadSingleQueryRow(int id)
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QuerySingleOrDefaultAsync<object>(
            "SELECT id, randomNumber FROM World WHERE id = @id", new { id });
    }

    public async Task<IEnumerable<object>> LoadMultipleQueriesRows(int limit, int offset)
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QueryAsync<object>(
            "SELECT id, randomNumber FROM World ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY",
            new { offset, limit });
    }

    public async Task<World?> SingleWriteRow(int id, int randomNumber)
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;

        var world = await db.QuerySingleOrDefaultAsync<World>(
            "SELECT id, randomNumber FROM World WHERE id = @id", new { id });

        if (world != null)
        {
            await db.ExecuteAsync(
                "UPDATE World SET randomNumber = @randomNumber WHERE id = @id",
                new { randomNumber, id = world.Id });
            return world with { RandomNumber = randomNumber };
        }

        return null;
    }

    public async Task<IEnumerable<World>> MultipleWriteRows(int limit, int offset, int[] rns)
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;

        var worlds = (await db.QueryAsync<World>(
            "SELECT id, randomNumber FROM World ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY",
            new { offset, limit })).ToList();

        if (worlds.Count == 0) return worlds;

        var sql = new System.Text.StringBuilder("UPDATE w SET randomNumber = temp.rn FROM World w INNER JOIN (VALUES ");

        for (int i = 0; i < worlds.Count; i++)
        {
            var newRandomNumber = i < rns.Length ? rns[i] : 1;
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
