FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["dotnet-minimal-apis.csproj", "./"]
RUN dotnet restore "dotnet-minimal-apis.csproj"
COPY . .
RUN dotnet publish "dotnet-minimal-apis.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:3000
EXPOSE 3000
ENTRYPOINT ["dotnet", "dotnet-minimal-apis.dll"]
