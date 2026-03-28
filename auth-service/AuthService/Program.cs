using AuthService.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
var dbHost     = Environment.GetEnvironmentVariable("DATABASE_HOST")     ?? "localhost";
var dbPort     = Environment.GetEnvironmentVariable("DATABASE_PORT")     ?? "5432";
var dbUser     = Environment.GetEnvironmentVariable("DATABASE_USER")     ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("DATABASE_PASSWORD") ?? "super";
var dbName     = Environment.GetEnvironmentVariable("DATABASE_NAME")     ?? "auth";

var connectionString =
    $"Host={dbHost};Port={dbPort};Username={dbUser};Password={dbPassword};Database={dbName}";

builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseNpgsql(connectionString));

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtKey    = Environment.GetEnvironmentVariable("JWT_KEY")    ?? builder.Configuration["Jwt:Key"]    ?? "change-me-in-production-min32chars!!";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? builder.Configuration["Jwt:Issuer"] ?? "AuthService";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = false,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ── OpenAPI / other services ──────────────────────────────────────────────────
builder.Services.AddOpenApi();
builder.Services.AddControllers();

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// Auto-apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();