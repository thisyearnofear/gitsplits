# NEAR Scripts

This directory contains scripts for working with NEAR blockchain, particularly for setting up Crosspost integration.

## Scripts

### Crosspost Integration

- `setup-crosspost.sh`: Main script that guides you through the entire Crosspost setup process
- `generate-crosspost-key.sh`: Generates a function call access key using standard near-cli
- `generate-crosspost-fcak.sh`: Generates a function call access key using near-cli-rs
- `add-crosspost-key.sh`: Adds an existing key as a function call access key
- `generate-keypair.sh`: Simple script to generate a NEAR keypair

## Usage

To set up Crosspost integration:

```bash
./setup-crosspost.sh
```

This will guide you through the process of:
1. Logging into NEAR
2. Generating a function call access key
3. Setting up your .env.local file

## Notes

- Some scripts may be duplicative as they were created to test different approaches
- The recommended script to use is `setup-crosspost.sh`
