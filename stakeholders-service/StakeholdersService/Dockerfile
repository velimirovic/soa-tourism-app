FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore StakeholdersService.csproj
RUN dotnet build StakeholdersService.csproj -c Release

FROM build AS publish
RUN dotnet publish StakeholdersService.csproj -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 80
EXPOSE 5001
CMD ["dotnet", "StakeholdersService.dll"]