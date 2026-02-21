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
