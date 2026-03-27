FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore StakeholdersService.csproj
RUN dotnet build StakeholdersService.csproj -c Release

FROM build AS publish
RUN dotnet publish StakeholdersService.csproj -c Release -o /app/publish

ENV ASPNETCORE_URLS=http://+:80
FROM base AS final
COPY --from=publish /app/publish .
CMD ["dotnet", "StakeholdersService.dll"]