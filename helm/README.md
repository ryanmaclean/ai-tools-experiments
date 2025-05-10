# ai-tools-tiny Helm Chart

Minimal Helm chart for deploying:
- Nginx (serving static content)
- Node.js app (serving on port 4321)
- Datadog agent (full config, based on Ara Pulido's public example)
- kube-state-metrics

## Features

- **Security:** No secrets in repo. Datadog API key is referenced via Kubernetes Secret.
- **Observability:** Datadog agent and kube-state-metrics included.
- **Minimal:** Only essential files and config.

## Usage

1. **Create Datadog API key secret:**
   ```sh
   kubectl create secret generic datadog-api-key --from-literal=api-key='<YOUR_DD_API_KEY>'
   ```

2. **Install chart:**
   ```sh
   helm install ai-tools-tiny . -f values.yaml -f templates/datadog-values.yaml
   ```

3. **Test chart:**
   See [test-helm.sh](./test-helm.sh) for a basic test script.

## File Structure

- `Chart.yaml` - Chart metadata and dependencies
- `values.yaml` - Main config
- `templates/nginx-deployment.yaml` - Nginx Deployment/Service
- `templates/node-deployment.yaml` - Node.js Deployment/Service
- `templates/datadog-values.yaml` - Example Datadog config (template, no secrets)

## References

- [Ara Pulido's Datadog Helm Examples](https://github.com/apulido/datadog-helm-examples)
- [Datadog Helm Chart Docs](https://github.com/DataDog/helm-charts)
- [kube-state-metrics Helm Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-state-metrics)
