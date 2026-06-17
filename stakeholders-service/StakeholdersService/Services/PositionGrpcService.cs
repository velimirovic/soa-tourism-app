using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using StakeholdersService.Infrastructure;
using StakeholdersService.Models;

namespace StakeholdersService.Grpc;

public class PositionGrpcService : PositionService.PositionServiceBase
{
    private readonly StakeholdersDbContext _db;

    public PositionGrpcService(StakeholdersDbContext db)
    {
        _db = db;
    }

    public override async Task<UpdatePositionResponse> UpdatePosition(
        UpdatePositionRequest request, ServerCallContext context)
    {
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == request.UserId);

        if (profile is null)
        {
            profile = new UserProfile { UserId = request.UserId, FirstName = "", LastName = "" };
            _db.UserProfiles.Add(profile);
        }

        profile.CurrentLatitude = request.Latitude;
        profile.CurrentLongitude = request.Longitude;

        await _db.SaveChangesAsync();

        return new UpdatePositionResponse
        {
            UserId = profile.UserId,
            Latitude = profile.CurrentLatitude ?? 0,
            Longitude = profile.CurrentLongitude ?? 0
        };
    }
}
