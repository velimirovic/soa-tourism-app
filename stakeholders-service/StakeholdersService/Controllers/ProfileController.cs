using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StakeholdersService.DTOs;
using StakeholdersService.Infrastructure;
using StakeholdersService.Models;

namespace StakeholdersService.Controllers;

[ApiController]
[Route("stakeholders/profile")]
public class ProfileController : ControllerBase
{
    private readonly StakeholdersDbContext _db;

    public ProfileController(StakeholdersDbContext db)
    {
        _db = db;
    }

    // GET /profile/{userId}
    [HttpGet("{userId:long}")]
    public async Task<IActionResult> GetProfile(long userId)
    {
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is null)
            return NotFound($"Profile for user {userId} not found.");

        return Ok(ToDto(profile));
    }

    // PUT /profile/{userId}
    [HttpPut("{userId:long}")]
    public async Task<IActionResult> UpdateProfile(long userId, [FromBody] UpdateProfileDto dto)
    {
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
        {
            profile = new UserProfile { UserId = userId };
            _db.UserProfiles.Add(profile);
        }

        profile.FirstName = dto.FirstName;
        profile.LastName = dto.LastName;
        profile.ProfilePicture = dto.ProfilePicture;
        profile.Biography = dto.Biography;
        profile.Motto = dto.Motto;

        await _db.SaveChangesAsync();
        return Ok(ToDto(profile));
    }

    // PUT /profile/{userId}/position
    [HttpPut("{userId:long}/position")]
    public async Task<IActionResult> UpdatePosition(long userId, [FromBody] UpdatePositionDto dto)
    {
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile is null)
        {
            profile = new UserProfile { UserId = userId, FirstName = "", LastName = "" };
            _db.UserProfiles.Add(profile);
        }

        profile.CurrentLatitude = dto.Latitude;
        profile.CurrentLongitude = dto.Longitude;

        await _db.SaveChangesAsync();
        return Ok(ToDto(profile));
    }

    private static UserProfileDto ToDto(UserProfile p) => new(
        p.UserId,
        p.FirstName,
        p.LastName,
        p.ProfilePicture,
        p.Biography,
        p.Motto,
        p.CurrentLatitude,
        p.CurrentLongitude
    );
}