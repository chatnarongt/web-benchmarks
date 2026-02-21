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
