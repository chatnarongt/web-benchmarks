using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleReadService
{
    World Execute(int id);
}

public class SingleReadService(DbConnectionFactory db) : ISingleReadService
{
    public World Execute(int id)
    {
        using var conn = db.CreateConnection();
        return conn.QueryFirst<World>(
            "SELECT Id, RandomNumber FROM World WHERE Id = @Id",
            new { Id = id });
    }
}
