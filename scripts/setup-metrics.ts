/// <reference types="bun-types" />
import { $ } from "bun";

export async function setupMetricsServer() {
  console.log("📊 Setting up metrics-server...");
  try {
    // Deploy metrics server
    await $`kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`.quiet();

    // Patch arguments to allow insecure TLS
    await $`kubectl patch deployment metrics-server -n kube-system -p '{"spec":{"template":{"spec":{"containers":[{"name":"metrics-server","args":["--cert-dir=/tmp","--secure-port=10250","--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname","--kubelet-use-node-status-port","--metric-resolution=15s","--kubelet-insecure-tls"]}]}}}}'`.quiet();

    console.log("⏳ Waiting for metrics-server to be ready...");

    // Wait for it to be ready
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 30) {
      try {
        const pods = await $`kubectl get pods -n kube-system -l k8s-app=metrics-server --no-headers`.text();
        if (pods.includes("1/1") || pods.includes("Running")) {
          ready = true;
          break;
        }
      } catch (e) {
        // ignore
      }
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
    console.log("✅ metrics-server is running.");
  } catch (error) {
    console.error("⚠️ Failed to setup metrics-server:", error);
  }
}
