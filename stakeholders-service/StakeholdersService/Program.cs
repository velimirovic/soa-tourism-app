using Microsoft.EntityFrameworkCore;
using StakeholdersService.Infrastructure;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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

// ── HttpClient za inter-service komunikaciju ──────────────────────────────────
var authServiceUrl = Environment.GetEnvironmentVariable("AUTH_SERVICE_URL") ?? "http://auth-service:80";
builder.Services.AddHttpClient("auth", client =>
{
    client.BaseAddress = new Uri(authServiceUrl);
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// ── OpenAPI / Controllers ─────────────────────────────────────────────────────
builder.Services.AddOpenApi();
builder.Services.AddControllers();

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<StakeholdersDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
