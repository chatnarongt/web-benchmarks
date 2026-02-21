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
            "SELECT id, randomNumber FROM World ORDER BY id LIMIT @limit OFFSET @offset",
            new { limit, offset })).ToList();

        if (worlds.Count == 0) return worlds;

        var ids = new int[worlds.Count];
        var rns = new int[worlds.Count];
        for (int i = 0; i < worlds.Count; i++)
        {
            ids[i] = worlds[i].Id;
            rns[i] = Random.Shared.Next(1, 10001);
            worlds[i] = worlds[i] with { RandomNumber = rns[i] };
        }

        await db.ExecuteAsync(
            "UPDATE World SET randomNumber = u.rn FROM unnest(@ids, @rns) AS u(id, rn) WHERE World.id = u.id",
            new { ids, rns });

        return worlds;
    }
}

public record World(int Id, int RandomNumber);
