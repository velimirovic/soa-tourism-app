using Microsoft.EntityFrameworkCore;
using StakeholdersService.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

var dbHost     = Environment.GetEnvironmentVariable("DATABASE_HOST")     ?? "localhost";
var dbPort     = Environment.GetEnvironmentVariable("DATABASE_PORT")     ?? "5432";
var dbUser     = Environment.GetEnvironmentVariable("DATABASE_USER")     ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("DATABASE_PASSWORD") ?? "super";
var dbName     = Environment.GetEnvironmentVariable("DATABASE_NAME")     ?? "stakeholders";

var connectionString =
    $"Host={dbHost};Port={dbPort};Username={dbUser};Password={dbPassword};Database={dbName}";

builder.Services.AddDbContext<StakeholdersDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddOpenApi();
builder.Services.AddControllers();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<StakeholdersDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.MapControllers();
app.Run();