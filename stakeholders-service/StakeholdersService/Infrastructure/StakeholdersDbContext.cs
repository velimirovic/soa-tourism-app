using Microsoft.EntityFrameworkCore;
using StakeholdersService.Models;

namespace StakeholdersService.Infrastructure;

public class StakeholdersDbContext : DbContext
{
    public StakeholdersDbContext(DbContextOptions<StakeholdersDbContext> options) : base(options) { }

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserProfile>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.UserId).IsUnique();
        });
    }
}