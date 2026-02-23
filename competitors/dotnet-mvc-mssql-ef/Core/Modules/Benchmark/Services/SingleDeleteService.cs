using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleDeleteService
{
    Temp Execute(int id);
}

public class SingleDeleteService(DatabaseContext db) : ISingleDeleteService
{
    public Temp Execute(int id)
    {
        var row = db.Temp.First(t => t.Id == id);
        db.Temp.Remove(row);
        db.SaveChanges();
        return row;
    }
}
