# GitSplits Deployment Scripts

This directory contains scripts for deploying and managing the GitSplits application.

## Scripts

- `check_server.sh`: Script to check the status of the server
- `deploy_to_hetzner.sh`: Script to deploy the application to the Hetzner server
- `pull-and-deploy.sh`: Script to pull the latest changes and deploy them
- `setup-server-env.sh`: Script to set up the server environment variables

## Usage

### Checking Server Status

```bash
./check_server.sh
```

### Deploying to Hetzner

```bash
./deploy_to_hetzner.sh
```

### Pulling and Deploying

```bash
./pull-and-deploy.sh
```

### Setting Up Server Environment

```bash
./setup-server-env.sh
```

## Notes

These scripts are designed to be run from the root directory of the project. Make sure you have the necessary permissions and SSH access configured before running them.
