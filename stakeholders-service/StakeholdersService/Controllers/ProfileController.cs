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

        return Ok(new UserProfileDto(
            profile.UserId,
            profile.FirstName,
            profile.LastName,
            profile.ProfilePicture,
            profile.Biography,
            profile.Motto
        ));
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
        return Ok(new UserProfileDto(
            profile.UserId,
            profile.FirstName,
            profile.LastName,
            profile.ProfilePicture,
            profile.Biography,
            profile.Motto
        ));
    }
}