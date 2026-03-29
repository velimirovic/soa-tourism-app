FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore AuthService.csproj
RUN dotnet build AuthService.csproj -c Release

FROM build AS publish
RUN dotnet publish AuthService.csproj -c Release -o /app/publish

FROM base AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:80
COPY --from=publish /app/publish .
CMD ["dotnet", "AuthService.dll"]