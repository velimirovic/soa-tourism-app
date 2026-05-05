namespace StakeholdersService.DTOs;

public record UserProfileDto(
    long UserId,
    string FirstName,
    string LastName,
    string? ProfilePicture,
    string? Biography,
    string? Motto,
    double? CurrentLatitude,
    double? CurrentLongitude
);

public record UpdateProfileDto(
    string FirstName,
    string LastName,
    string? ProfilePicture,
    string? Biography,
    string? Motto
);

public record UpdatePositionDto(
    double Latitude,
    double Longitude
);