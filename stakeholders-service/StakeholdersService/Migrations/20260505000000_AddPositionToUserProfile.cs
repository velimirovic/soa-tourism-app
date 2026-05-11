using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StakeholdersService.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionToUserProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "CurrentLatitude",
                table: "UserProfiles",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CurrentLongitude",
                table: "UserProfiles",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentLatitude",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "CurrentLongitude",
                table: "UserProfiles");
        }
    }
}
