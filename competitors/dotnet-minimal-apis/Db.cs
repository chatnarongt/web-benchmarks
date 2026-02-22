using Dapper;
using Npgsql;
using System.Data.Common;

namespace DotnetMinimalApis;

public class Db
{
    private readonly DbProviderFactory _dbProviderFactory;
    private readonly string _connectionString;

    public Db(string connectionString)
    {
        _dbProviderFactory = NpgsqlFactory.Instance;
        _connectionString = connectionString;
    }

    public async Task<World?> LoadSingleQueryRow(int id)
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QuerySingleOrDefaultAsync<World>(
            "SELECT id, randomNumber FROM World WHERE id = @id", new { id });
    }

    public async Task<IEnumerable<World>> LoadMultipleQueriesRows(int limit, int offset)
    {
        using var db = _dbProviderFactory.CreateConnection();
        db!.ConnectionString = _connectionString;
        return await db.QueryAsync<World>(
            "SELECT id, randomNumber FROM World ORDER BY id LIMIT @limit OFFSET @offset",
            new { limit, offset });
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
            "SELECT id, randomNumber FROM World ORDER BY id LIMIT @limit OFFSET @offset",
            new { limit, offset })).ToList();

        if (worlds.Count == 0) return worlds;

        var ids = new int[worlds.Count];
        var mappedRns = new int[worlds.Count];
        for (int i = 0; i < worlds.Count; i++)
        {
            ids[i] = worlds[i].Id;
            mappedRns[i] = i < rns.Length ? rns[i] : 1;
            worlds[i] = worlds[i] with { RandomNumber = mappedRns[i] };
        }

        await db.ExecuteAsync(
            "UPDATE World SET randomNumber = u.rn FROM unnest(@ids, @mappedRns) AS u(id, rn) WHERE World.id = u.id",
            new { ids, mappedRns });

        return worlds;
    }
}

public record World(int Id, int RandomNumber);
