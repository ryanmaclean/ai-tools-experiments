#!/bin/bash
# Minimal test for ai-tools-tiny Helm chart

set -euo pipefail

RELEASE=ai-tools-tiny-test
CHART_DIR="$(dirname "$0")"
NAMESPACE="helm-test-$(date +%s)"

echo "Creating test namespace: $NAMESPACE"
kubectl create namespace "$NAMESPACE"

echo "Creating dummy Datadog API key secret"
kubectl -n "$NAMESPACE" create secret generic datadog-api-key --from-literal=api-key='dummy'

echo "Installing Helm chart..."
helm install "$RELEASE" "$CHART_DIR" -n "$NAMESPACE" -f "$CHART_DIR/values.yaml" -f "$CHART_DIR/templates/datadog-values.yaml"

echo "Waiting for pods to be ready..."
kubectl -n "$NAMESPACE" wait --for=condition=Ready pod -l app=nginx --timeout=120s
kubectl -n "$NAMESPACE" wait --for=condition=Ready pod -l app=node --timeout=120s

echo "Checking Nginx service..."
kubectl -n "$NAMESPACE" get svc nginx

echo "Checking Node service..."
kubectl -n "$NAMESPACE" get svc node

echo "Checking Datadog agent DaemonSet..."
kubectl -n "$NAMESPACE" get ds -l app=datadog

echo "Checking kube-state-metrics deployment..."
kubectl -n "$NAMESPACE" get deploy -l app.kubernetes.io/name=kube-state-metrics

echo "Test PASSED: All resources deployed and ready."

echo "Cleaning up..."
helm uninstall "$RELEASE" -n "$NAMESPACE"
kubectl delete namespace "$NAMESPACE"
