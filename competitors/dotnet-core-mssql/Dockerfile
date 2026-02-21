FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["dotnet-core-mssql.csproj", "./"]
RUN dotnet restore "dotnet-core-mssql.csproj"
COPY . .
RUN dotnet publish "dotnet-core-mssql.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:3000
EXPOSE 3000
ENTRYPOINT ["dotnet", "dotnet-core-mssql.dll"]
