using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Database.Benchmark;

public partial class BenchmarkContext : DbContext
{
    public BenchmarkContext(DbContextOptions<BenchmarkContext> options)
        : base(options) { }

    public virtual DbSet<Temp> Temp { get; set; }

    public virtual DbSet<World> World { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Temp>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Temp__3213E83F38F60023");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.RandomNumber).HasColumnName("randomNumber");
        });

        modelBuilder.Entity<World>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__World__3213E83FD26C5AB2");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.RandomNumber).HasColumnName("randomNumber");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
