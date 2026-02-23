using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleReadService
{
    List<World> Execute(List<int> ids);
}

public class MultipleReadService(DatabaseContext db) : IMultipleReadService
{
    public List<World> Execute(List<int> ids)
    {
        return db.World.Where(w => ids.Contains(w.Id)).ToList();
    }
}
