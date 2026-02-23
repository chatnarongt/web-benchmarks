using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleDeleteService
{
    Temp Execute(int id);
}

public class SingleDeleteService(DbConnectionFactory db) : ISingleDeleteService
{
    public Temp Execute(int id)
    {
        using var conn = db.CreateConnection();
        return conn.QueryFirst<Temp>(
            "DELETE FROM Temp OUTPUT DELETED.Id, DELETED.RandomNumber WHERE Id = @Id",
            new { Id = id });
    }
}
