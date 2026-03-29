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

// Ensure schema exists — radi i na novoj i na postojecoj bazi
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();

    // Ceka da Postgres bude spreman (retry loop za Docker startup)
    var retries = 10;
    while (retries-- > 0)
    {
        try
        {
            // Kreira tabele direktno putem SQL-a — idempotentno (IF NOT EXISTS)
            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id""           bigserial                   PRIMARY KEY,
                    ""Username""     character varying           NOT NULL,
                    ""Email""        character varying           NOT NULL,
                    ""PasswordHash"" character varying           NOT NULL,
                    ""Role""         character varying           NOT NULL,
                    ""IsBlocked""    boolean                     NOT NULL DEFAULT false,
                    ""CreatedAt""    timestamp with time zone    NOT NULL DEFAULT now()
                );

                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Users_Username""
                    ON ""Users"" (""Username"");

                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Users_Email""
                    ON ""Users"" (""Email"");
            ");
            break;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Auth] DB not ready, retrying... ({ex.Message})");
            Thread.Sleep(2000);
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
