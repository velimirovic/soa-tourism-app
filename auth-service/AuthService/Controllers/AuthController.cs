using AuthService.DTOs;
using AuthService.Infrastructure;
using AuthService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AuthService.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AuthDbContext _db;
    private readonly IConfiguration _config;
    private readonly string _jwtKey;
    private readonly string _jwtIssuer;

    public AuthController(AuthDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
        _jwtKey    = Environment.GetEnvironmentVariable("JWT_KEY")    ?? config["Jwt:Key"]    ?? "change-me-in-production-min32chars!!";
        _jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? config["Jwt:Issuer"] ?? "AuthService";
    }

    // POST /auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Only Tourist and Guide can self-register
        var allowedRoles = new[] { "Tourist", "Guide" };
        if (!allowedRoles.Contains(req.Role, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "Role must be 'Tourist' or 'Guide'." });

        // Normalize role casing
        var role = allowedRoles.First(r => r.Equals(req.Role, StringComparison.OrdinalIgnoreCase));

        // Check uniqueness
        var usernameExists = await _db.Users.AnyAsync(u => u.Username == req.Username);
        if (usernameExists)
            return Conflict(new { error = "Username is already taken." });

        var emailExists = await _db.Users.AnyAsync(u => u.Email == req.Email);
        if (emailExists)
            return Conflict(new { error = "Email is already registered." });

        var user = new User
        {
            Username     = req.Username,
            Email        = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role         = role,
            IsBlocked    = false,
            CreatedAt    = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateJwt(user);

        return CreatedAtAction(nameof(Register), new AuthResponse
        {
            Token    = token,
            Id       = user.Id,
            Username = user.Username,
            Email    = user.Email,
            Role     = user.Role
        });
    }

    // POST /auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid username or password." });

        if (user.IsBlocked)
            return Forbid();

        var token = GenerateJwt(user);

        return Ok(new AuthResponse
        {
            Token    = token,
            Id       = user.Id,
            Username = user.Username,
            Email    = user.Email,
            Role     = user.Role
        });
    }

    // GET /auth/users/public  — dostupno svim ulogovanim korisnicima, vraca samo javne podatke
    [HttpGet("users/public")]
    [Authorize]
    public async Task<IActionResult> GetPublicUsers()
    {
        var users = await _db.Users
            .Where(u => u.Role != "Admin" && !u.IsBlocked)
            .OrderBy(u => u.Username)
            .Select(u => new { id = u.Id.ToString(), username = u.Username, role = u.Role })
            .ToListAsync();

        return Ok(users);
    }

    // GET /auth/users
    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _db.Users
            .OrderBy(u => u.Id)
            .Select(u => new UserDto
            {
                Id        = u.Id,
                Username  = u.Username,
                Email     = u.Email,
                Role      = u.Role,
                IsBlocked = u.IsBlocked,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    // PATCH /auth/users/{id}/block
    [HttpPatch("users/{id}/block")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleBlock(long id)
    {
        // Admin cannot block themselves
        var adminIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var adminId = long.Parse(adminIdStr!);
        if (adminId == id)
            return BadRequest(new { error = "You cannot block your own account." });

        var user = await _db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { error = "User not found." });

        user.IsBlocked = !user.IsBlocked;
        await _db.SaveChangesAsync();

        return Ok(new UserDto
        {
            Id        = user.Id,
            Username  = user.Username,
            Email     = user.Email,
            Role      = user.Role,
            IsBlocked = user.IsBlocked,
            CreatedAt = user.CreatedAt
        });
    }

    // Helpers

    private string GenerateJwt(User user)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,  user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username", user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer:            _jwtIssuer,
            audience:          null,
            claims:            claims,
            expires:           DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
