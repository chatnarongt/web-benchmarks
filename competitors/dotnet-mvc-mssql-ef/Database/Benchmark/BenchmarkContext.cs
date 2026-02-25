using Microsoft.EntityFrameworkCore;

namespace Database.Benchmark;

public partial class BenchmarkContext : DbContext
{
    public BenchmarkContext() { }

    public BenchmarkContext(DbContextOptions<BenchmarkContext> options)
        : base(options) { }

    public virtual DbSet<Temp> Temps { get; set; }

    public virtual DbSet<World> Worlds { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) =>
        optionsBuilder.UseSqlServer("Name=BenchmarkDatabase");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Temp>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Temp__3213E83F433261B2");

            entity.ToTable("Temp");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.RandomNumber).HasColumnName("randomNumber");
        });

        modelBuilder.Entity<World>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__World__3213E83F5E9676F9");

            entity.ToTable("World");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.RandomNumber).HasColumnName("randomNumber");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
