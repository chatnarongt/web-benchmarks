using Dapper;
using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleCreateService
{
    List<Temp> Execute(List<int> r);
}

public class MultipleCreateService(DbConnectionFactory db) : IMultipleCreateService
{
    public List<Temp> Execute(List<int> r)
    {
        using var conn = db.CreateConnection();
        // Execute one INSERT per value — Dapper maps each item in the collection
        // as a separate parameter set, using OUTPUT to return the created row.
        return conn.Query<Temp>(
            "INSERT INTO Temp (RandomNumber) OUTPUT INSERTED.Id, INSERTED.RandomNumber VALUES (@RandomNumber)",
            r.Select(n => new { RandomNumber = n })).ToList();
    }
}
