# Datadog Synthetics Tests via Terraform

This directory contains Terraform configurations to manage Datadog Synthetics tests for all routes in the AI Tools Lab project. Using infrastructure as code to manage monitoring resources ensures consistency and enables version control of your monitoring configuration.

## Test Coverage

These Terraform configurations create the following Synthetic browser tests:

- **Homepage Test** - Verifies the main landing page and episode grid
- **About Page Test** - Checks the about page content and structure
- **Resources Page Test** - Validates resource cards are present and properly loaded
- **Observations Page Test** - Confirms observations content is accessible 
- **Episode Page Tests (17)** - Tests for all individual episode pages (ep01-ep17)

Each test performs several key checks:
1. Page accessibility (HTTP 200 status)
2. Critical content elements presence
3. Navigation elements functionality
4. Visual validation via screenshots

## Usage Instructions

### Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) installed (v1.0.0+)
- Datadog account with API and Application keys

### Setup

1. **Copy the example variables file**:

```bash
cp terraform.tfvars.example terraform.tfvars
```

2. **Edit the `terraform.tfvars` file** with your actual Datadog API and Application keys:

```hcl
datadog_api_key = "your_actual_api_key"
datadog_app_key = "your_actual_application_key"
```

3. **Initialize Terraform**:

```bash
terraform init
```

4. **Plan your changes**:

```bash
terraform plan
```

5. **Apply the configuration** to create the tests in Datadog:

```bash
terraform apply
```

### Modifying Tests

- To change test frequencies or other parameters, edit the `locals` block in `datadog_synthetics.tf`
- To add new tests for additional routes, add them to the appropriate sections
- To modify test assertions or steps, update the `browser_step` blocks

### Automating with CI/CD

You can integrate this with GitHub Actions by adding a workflow that runs terraform on changes to the monitoring configuration. Store the Datadog credentials as GitHub Secrets.

```yaml
# Example partial workflow
steps:
  - uses: actions/checkout@v3
  - name: Setup Terraform
    uses: hashicorp/setup-terraform@v2
  - name: Terraform Apply
    env:
      TF_VAR_datadog_api_key: ${{ secrets.DD_API_KEY }}
      TF_VAR_datadog_app_key: ${{ secrets.DD_APP_KEY }}
    run: |
      cd terraform
      terraform init
      terraform apply -auto-approve
```

## Viewing Tests in Datadog

After applying the Terraform configuration, you can view your tests in the Datadog UI:

1. Go to **UX Monitoring > Synthetic Tests** in your Datadog account
2. Filter by tag `ai-tools-lab` to see all the tests created by this configuration

## URL Pattern Handling

These tests account for the URL pattern differences between environments:
- **Production** (ai-tools-lab.com): Uses `/pages/` prefix for some routes
- **Staging** (ai-tools-lab-tst.netlify.app): Uses direct paths

This is handled automatically through the `get_url` local variable.
