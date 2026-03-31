using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StakeholdersService.DTOs;
using System.Text.Json;

namespace StakeholdersService.Controllers;

[ApiController]
[Route("stakeholders")]
public class UsersController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public UsersController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

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
}
