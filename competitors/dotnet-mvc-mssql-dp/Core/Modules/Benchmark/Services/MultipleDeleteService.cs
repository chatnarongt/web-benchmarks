using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleDeleteService
{
    List<Temp> Execute(List<int> ids);
}

public class MultipleDeleteService(DbConnectionFactory db) : IMultipleDeleteService
{
    public List<Temp> Execute(List<int> ids)
    {
        using var conn = db.CreateConnection();
        return conn.Query<Temp>(
            "DELETE FROM Temp OUTPUT DELETED.Id, DELETED.RandomNumber WHERE Id IN @Ids",
            new { Ids = ids }).ToList();
    }
}
