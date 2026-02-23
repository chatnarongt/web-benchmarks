using Database;

namespace Core.Modules.Benchmark.Services;

public interface IMultipleUpdateService
{
    List<World> Execute(List<int> ids, List<int> r);
}

public class MultipleUpdateService(DatabaseContext db) : IMultipleUpdateService
{
    public List<World> Execute(List<int> ids, List<int> r)
    {
        var rows = db.World.Where(w => ids.Contains(w.Id)).ToList();
        // Re-order to match the original ids order for positional r mapping
        var ordered = ids.Select(id => rows.First(w => w.Id == id)).ToList();

        for (int i = 0; i < ordered.Count; i++)
        {
            ordered[i].RandomNumber = r[i];
        }
        db.SaveChanges();
        return ordered;
    }
}
