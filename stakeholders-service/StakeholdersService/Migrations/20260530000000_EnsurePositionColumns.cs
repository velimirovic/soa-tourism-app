using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StakeholdersService.Migrations
{
    public partial class EnsurePositionColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""UserProfiles""
                ADD COLUMN IF NOT EXISTS ""CurrentLatitude"" double precision,
                ADD COLUMN IF NOT EXISTS ""CurrentLongitude"" double precision;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CurrentLatitude", table: "UserProfiles");
            migrationBuilder.DropColumn(name: "CurrentLongitude", table: "UserProfiles");
        }
    }
}
