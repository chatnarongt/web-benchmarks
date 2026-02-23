using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleCreateService
{
    Temp Execute(int randomNumber);
}

public class SingleCreateService(DatabaseContext db) : ISingleCreateService
{
    public Temp Execute(int randomNumber)
    {
        var row = new Temp { RandomNumber = randomNumber };
        db.Temp.Add(row);
        db.SaveChanges();
        return row;
    }
}
