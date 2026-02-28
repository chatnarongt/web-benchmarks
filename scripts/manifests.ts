/// <reference types="bun-types" />
export function generateK8sManifest(name: string, resources: any, envVars?: Record<string, string>): string {
  let envString = "";
  if (envVars && Object.keys(envVars).length > 0) {
    envString = "\n        env:";
    for (const [key, value] of Object.entries(envVars)) {
      const escapedValue = value.replace(/"/g, '\\"');
      envString += `\n        - name: ${key}\n          value: "${escapedValue}"`;
    }
  }

  return `
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-deployment
  labels:
    app: ${name}
spec:
  replicas: ${resources.replicas || 1}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
      - name: ${name}
        image: ${name}:benchmark
        imagePullPolicy: Never # Use local image built by step 2${envString}
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: "${resources.requests.cpu}"
            memory: "${resources.requests.memory}"
          limits:
            cpu: "${resources.limits.cpu}"
            memory: "${resources.limits.memory}"
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}-service
spec:
  selector:
    app: ${name}
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
`;
}

export function generatePostgresManifest(resources: any, suffix: string = ""): string {
  const nameSuffix = suffix ? `-${suffix}` : "";
  const deploymentName = `postgres-deployment${nameSuffix}`;
  const serviceName = `postgres-service${nameSuffix}`;
  const configMapName = `postgres-init-script${nameSuffix}`;
  const appLabel = `postgres${nameSuffix}`;

  return `
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${configMapName}
data:
  init.sql: |
    -- Stable read/update dataset
    CREATE TABLE World (
      id SERIAL PRIMARY KEY,
      randomNumber INTEGER NOT NULL
    );
    INSERT INTO World (randomNumber) SELECT floor(random() * 10000 + 1) FROM generate_series(1, 10000);

    -- Scratch table for create/delete benchmarks
    CREATE TABLE Temp (
      id SERIAL PRIMARY KEY,
      randomNumber INTEGER NOT NULL
    );
    INSERT INTO Temp (randomNumber) SELECT floor(random() * 10000 + 1) FROM generate_series(1, 100000000);
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deploymentName}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${appLabel}
  template:
    metadata:
      labels:
        app: ${appLabel}
    spec:
      containers:
      - name: postgres
        image: postgres:18-alpine
        env:
        - name: POSTGRES_PASSWORD
          value: benchmark
        - name: POSTGRES_DB
          value: benchmark
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: init-script
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            cpu: "${resources.requests.cpu}"
            memory: "${resources.requests.memory}"
          limits:
            cpu: "${resources.limits.cpu}"
            memory: "${resources.limits.memory}"
      volumes:
      - name: init-script
        configMap:
          name: ${configMapName}
---
apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
spec:
  selector:
    app: ${appLabel}
  ports:
    - protocol: TCP
      port: 5432
      targetPort: 5432
`;
}

export function generateMssqlManifest(resources: any, suffix: string = ""): string {
  const nameSuffix = suffix ? `-${suffix}` : "";
  const deploymentName = `mssql-deployment${nameSuffix}`;
  const serviceName = `mssql-service${nameSuffix}`;
  const configMapName = `mssql-init-script${nameSuffix}`;
  const appLabel = `mssql${nameSuffix}`;

  return `
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${configMapName}
data:
  init.sql: |
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'benchmark')
    BEGIN
        CREATE DATABASE benchmark;
    END
    GO
    USE benchmark;
    -- Stable read/update dataset
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='World' and xtype='U')
    BEGIN
        CREATE TABLE World (
            id INT PRIMARY KEY IDENTITY(1,1),
            randomNumber INT NOT NULL
        );
        DECLARE @cnt INT = 0;
        WHILE @cnt < 10000
        BEGIN
            INSERT INTO World (randomNumber) VALUES (ABS(CHECKSUM(NEWID())) % 10000 + 1);
            SET @cnt = @cnt + 1;
        END
    END
    GO
    -- Scratch table for create/delete benchmarks
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Temp' and xtype='U')
    BEGIN
        CREATE TABLE Temp (
            id INT PRIMARY KEY IDENTITY(1,1),
            randomNumber INT NOT NULL
        );
        INSERT INTO Temp (randomNumber)
        SELECT TOP 100000000 ABS(CHECKSUM(NEWID())) % 10000 + 1
        FROM sys.all_objects a
        CROSS JOIN sys.all_objects b
        CROSS JOIN sys.all_objects c;
    END
    GO
  entrypoint.sh: |
    #!/bin/bash
    set -x
    echo ">>>> SEEDING SCRIPT STARTING <<<<"
    # Start SQL Server
    /opt/mssql/bin/sqlservr &

    echo ">>>> Waiting for SQL Server to accept connections <<<<"
    # Wait for it to start
    # Try to connect every 2 seconds for up to 60 seconds
    for i in {1..30}; do
      if /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1; then
        echo ">>>> SQL Server is ready! <<<<"
        break
      fi
      echo ">>>> SQL Server not ready yet (attempt $i)... <<<<"
      sleep 2
    done

    # Run the init script
    echo ">>>> Running init.sql <<<<"
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -i /scripts/init.sql
    echo ">>>> Seed script finished! <<<<"

    # Wait for the main process
    wait
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deploymentName}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${appLabel}
  template:
    metadata:
      labels:
        app: ${appLabel}
    spec:
      containers:
      - name: mssql
        image: mcr.microsoft.com/mssql/server:2022-latest
        command: ["/bin/bash", "-c", "/scripts/entrypoint.sh"]
        env:
        - name: ACCEPT_EULA
          value: "Y"
        - name: MSSQL_SA_PASSWORD
          value: "Benchmark123!"
        ports:
        - containerPort: 1433
        volumeMounts:
        - name: scripts
          mountPath: /scripts
        resources:
          requests:
            cpu: "${resources.requests.cpu}"
            memory: "${resources.requests.memory}"
          limits:
            cpu: "${resources.limits.cpu}"
            memory: "${resources.limits.memory}"
      volumes:
      - name: scripts
        configMap:
          name: ${configMapName}
          defaultMode: 0755
---
apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
spec:
  selector:
    app: ${appLabel}
  ports:
    - protocol: TCP
      port: 1433
      targetPort: 1433
`;
}
