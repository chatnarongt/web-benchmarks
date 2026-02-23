using Database;

namespace Core.Modules.Benchmark.Services;

public interface ISingleUpdateService
{
    World Execute(int id, int randomNumber);
}

public class SingleUpdateService(DatabaseContext db) : ISingleUpdateService
{
    public World Execute(int id, int randomNumber)
    {
        var world = db.World.First(w => w.Id == id);
        world.RandomNumber = randomNumber;
        db.SaveChanges();
        return world;
    }
}
