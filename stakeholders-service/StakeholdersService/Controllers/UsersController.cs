using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StakeholdersService.DTOs;
using StakeholdersService.Infrastructure;
using System.Text.Json;

namespace StakeholdersService.Controllers;

[ApiController]
[Route("stakeholders")]
public class UsersController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly StakeholdersDbContext _db;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public UsersController(IHttpClientFactory httpClientFactory, StakeholdersDbContext db)
    {
        _httpClientFactory = httpClientFactory;
        _db = db;
    }

    // GET /stakeholders/users/discover
    [HttpGet("users/discover")]
    [Authorize]
    public async Task<IActionResult> GetDiscoverUsers()
    {
        var client = _httpClientFactory.CreateClient("auth");

        var authHeader = HttpContext.Request.Headers["Authorization"].ToString();
        var request = new HttpRequestMessage(HttpMethod.Get, "/auth/users/public");
        request.Headers.TryAddWithoutValidation("Authorization", authHeader);

        var response = await client.SendAsync(request);

        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        var authUsers = JsonSerializer.Deserialize<List<PublicUserFromAuth>>(content, _jsonOptions) ?? [];

        var numericIds = authUsers
            .Select(u => long.TryParse(u.Id, out var n) ? n : (long?)null)
            .Where(n => n.HasValue).Select(n => n!.Value).ToList();

        var profiles = await _db.UserProfiles
            .Where(p => numericIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, p => p.ProfilePicture);

        var result = authUsers.Select(u => new PublicUserDto(
            u.Id,
            u.Username,
            u.Role,
            long.TryParse(u.Id, out var uid) && profiles.TryGetValue(uid, out var pic) ? pic : null
        ));

        return Ok(result);
    }

    private record PublicUserFromAuth(string Id, string Username, string Role);

    // GET /stakeholders/users
    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllUsers()
    {
        var client = _httpClientFactory.CreateClient("auth");

        var authHeader = HttpContext.Request.Headers["Authorization"].ToString();
        var request = new HttpRequestMessage(HttpMethod.Get, "/auth/users");
        request.Headers.TryAddWithoutValidation("Authorization", authHeader);

        var response = await client.SendAsync(request);

        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        var users   = JsonSerializer.Deserialize<List<UserDto>>(content, _jsonOptions);

        return Ok(users);
    }

    // PATCH /stakeholders/users/{id}/block
    [HttpPatch("users/{id}/block")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleBlock(long id)
    {
        var client = _httpClientFactory.CreateClient("auth");

        var authHeader = HttpContext.Request.Headers["Authorization"].ToString();
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/auth/users/{id}/block");
        request.Headers.TryAddWithoutValidation("Authorization", authHeader);

        var response = await client.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            return StatusCode((int)response.StatusCode, JsonSerializer.Deserialize<JsonElement>(errorContent));
        }

        var content = await response.Content.ReadAsStringAsync();
        var user    = JsonSerializer.Deserialize<UserDto>(content, _jsonOptions);

        return Ok(user);
    }
}
