using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleReadService
{
    World Execute(int id);
}

public class SingleReadService(DatabaseContext db) : ISingleReadService
{
    public World Execute(int id)
    {
        return db.World.First(w => w.Id == id);
    }
}
