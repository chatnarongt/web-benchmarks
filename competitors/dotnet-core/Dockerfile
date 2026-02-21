FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["dotnet-core.csproj", "./"]
RUN dotnet restore "dotnet-core.csproj"
COPY . .
RUN dotnet publish "dotnet-core.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:3000
EXPOSE 3000
ENTRYPOINT ["dotnet", "dotnet-core.dll"]
