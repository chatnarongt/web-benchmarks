using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleUpdateService
{
    List<World> Execute(List<int> ids, List<int> r);
}

public class MultipleUpdateService(DbConnectionFactory db) : IMultipleUpdateService
{
    public List<World> Execute(List<int> ids, List<int> r)
    {
        using var conn = db.CreateConnection();
        var results = new List<World>(ids.Count);
        for (int i = 0; i < ids.Count; i++)
        {
            var row = conn.QueryFirst<World>(
                "UPDATE World SET RandomNumber = @RandomNumber OUTPUT INSERTED.Id, INSERTED.RandomNumber WHERE Id = @Id",
                new { Id = ids[i], RandomNumber = r[i] });
            results.Add(row);
        }
        return results;
    }
}
