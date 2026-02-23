namespace Core.Modules.Benchmark.Models;

public record SingleCreateRequest(int RandomNumber);

public record MultipleCreateRequest(List<int> R);

public record SingleUpdateRequest(int Id, int RandomNumber);

public record MultipleUpdateRequest(List<int> Ids, List<int> R);
