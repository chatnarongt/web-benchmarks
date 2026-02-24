using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Database.Benchmark;

public partial class BenchmarkContext : DbContext
{
    public BenchmarkContext() { }

    public BenchmarkContext(DbContextOptions<BenchmarkContext> options)
        : base(options) { }

    public virtual DbSet<World> Worlds { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) =>
        optionsBuilder.UseSqlServer("Name=BenchmarkDatabase");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<World>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__World__3213E83FD26C5AB2");

            entity.ToTable("World");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.RandomNumber).HasColumnName("randomNumber");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
