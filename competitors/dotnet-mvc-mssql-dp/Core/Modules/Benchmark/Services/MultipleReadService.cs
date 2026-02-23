using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleReadService
{
    List<World> Execute(List<int> ids);
}

public class MultipleReadService(DbConnectionFactory db) : IMultipleReadService
{
    public List<World> Execute(List<int> ids)
    {
        using var conn = db.CreateConnection();
        return conn.Query<World>(
            "SELECT Id, RandomNumber FROM World WHERE Id IN @Ids",
            new { Ids = ids }).ToList();
    }
}
