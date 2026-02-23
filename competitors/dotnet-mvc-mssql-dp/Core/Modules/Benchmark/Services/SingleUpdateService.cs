using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleUpdateService
{
    World Execute(int id, int randomNumber);
}

public class SingleUpdateService(DbConnectionFactory db) : ISingleUpdateService
{
    public World Execute(int id, int randomNumber)
    {
        using var conn = db.CreateConnection();
        return conn.QueryFirst<World>(
            "UPDATE World SET RandomNumber = @RandomNumber OUTPUT INSERTED.Id, INSERTED.RandomNumber WHERE Id = @Id",
            new { Id = id, RandomNumber = randomNumber });
    }
}
