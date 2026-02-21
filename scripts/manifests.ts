export function generateK8sManifest(name: string, resources: any): string {
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
        imagePullPolicy: Never # Use local image built by step 2
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

export function generatePostgresManifest(): string {
  return `
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init-script
data:
  init.sql: |
    CREATE TABLE World (
      id SERIAL PRIMARY KEY,
      randomNumber INTEGER NOT NULL
    );
    INSERT INTO World (randomNumber) SELECT floor(random() * 10000 + 1) FROM generate_series(1, 10000);
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
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
            cpu: "4"
            memory: "8Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
      volumes:
      - name: init-script
        configMap:
          name: postgres-init-script
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  selector:
    app: postgres
  ports:
    - protocol: TCP
      port: 5432
      targetPort: 5432
`;
}

export function generateMssqlManifest(): string {
  return `
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mssql-init-script
data:
  init.sql: |
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'benchmark')
    BEGIN
        CREATE DATABASE benchmark;
    END
    GO
    USE benchmark;
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='World' and xtype='U')
    BEGIN
        CREATE TABLE World (
            id INT PRIMARY KEY IDENTITY(1,1),
            randomNumber INT NOT NULL
        );
        -- Insert 10,000 rows
        DECLARE @cnt INT = 0;
        WHILE @cnt < 10000
        BEGIN
            INSERT INTO World (randomNumber) VALUES (ABS(CHECKSUM(NEWID())) % 10000 + 1);
            SET @cnt = @cnt + 1;
        END
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
  name: mssql-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mssql
  template:
    metadata:
      labels:
        app: mssql
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
            cpu: "4"
            memory: "8Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
      volumes:
      - name: scripts
        configMap:
          name: mssql-init-script
          defaultMode: 0755
---
apiVersion: v1
kind: Service
metadata:
  name: mssql-service
spec:
  selector:
    app: mssql
  ports:
    - protocol: TCP
      port: 1433
      targetPort: 1433
`;
}
