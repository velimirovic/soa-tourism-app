namespace StakeholdersService.DTOs;

public record UserProfileDto(
    long UserId,
    string FirstName,
    string LastName,
    string? ProfilePicture,
    string? Biography,
    string? Motto
);

public record UpdateProfileDto(
    string FirstName,
    string LastName,
    string? ProfilePicture,
    string? Biography,
    string? Motto
);