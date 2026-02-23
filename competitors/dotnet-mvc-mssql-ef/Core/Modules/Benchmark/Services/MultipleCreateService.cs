using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleCreateService
{
    List<Temp> Execute(List<int> r);
}

public class MultipleCreateService(DatabaseContext db) : IMultipleCreateService
{
    public List<Temp> Execute(List<int> r)
    {
        var rows = r.Select(n => new Temp { RandomNumber = n }).ToList();
        db.Temp.AddRange(rows);
        db.SaveChanges();
        return rows;
    }
}
