using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleCreateService
{
    Temp Execute(int randomNumber);
}

public class SingleCreateService(DbConnectionFactory db) : ISingleCreateService
{
    public Temp Execute(int randomNumber)
    {
        using var conn = db.CreateConnection();
        return conn.QueryFirst<Temp>(
            "INSERT INTO Temp (RandomNumber) OUTPUT INSERTED.Id, INSERTED.RandomNumber VALUES (@RandomNumber)",
            new { RandomNumber = randomNumber });
    }
}
