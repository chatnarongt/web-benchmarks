using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleDeleteService
{
    List<Temp> Execute(List<int> ids);
}

public class MultipleDeleteService(DatabaseContext db) : IMultipleDeleteService
{
    public List<Temp> Execute(List<int> ids)
    {
        var rows = db.Temp.Where(t => ids.Contains(t.Id)).ToList();
        db.Temp.RemoveRange(rows);
        db.SaveChanges();
        return rows;
    }
}
