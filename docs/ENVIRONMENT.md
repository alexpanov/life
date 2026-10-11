# Encrypted environment configuration

Use **dotenvx**, installed as a pinned development dependency. There are exactly two environments: `development` and `live`. This prepares encrypted configuration; it does not connect a model, create credentials or change the current simulator.

Dotenvx uses a generated public/private key pair, not a human passphrase. The requested `flower` passphrase is not used: it is already disclosed in chat and cannot serve as a secret. We do not add custom encryption or disguise a passphrase as a dotenvx key. Separate generated keys protect development and live.

## Prepare configuration locally

1. Copy `.env.example` to `.env.development`.
2. Fill the values using an editor on your own machine. The example variable names reserve server-side configuration; the model gateway consumes these keys only on the server.
3. Run `npm run env:encrypt:development`.
4. Run `npm run env:check` before staging. Commit only the encrypted `.env.development` file.
5. Repeat with `.env.live` and `npm run env:encrypt:live` when live credentials exist.

Encryption generates `.env.keys`, ignored by Git. Store it in a password manager; never commit it or send it through chat. Losing the private key means the ciphertext cannot be recovered. For rotation, replace the provider credential as well as updating the encrypted file; deleting old Git history alone does not revoke a credential.

The gate rejects plaintext environment values, tracked private-key files and recognizable private-key material. It is a narrow configuration check, not a general secret scanner. Run it on the working tree before staging and in CI against the checked-out revision. It does not repair secrets already committed to history.

## Run a server process

Use `npm run env:development -- <server command>` or `npm run env:live -- <server command>`. Dotenvx decrypts into that process environment. Configure `DOTENV_PRIVATE_KEY_DEVELOPMENT` or `DOTENV_PRIVATE_KEY_LIVE` through the deployment provider's secret settings. Do not store either key in workflow YAML or an encrypted file whose decryption requires that same key.

Do not use these server secrets to build the public web app. `VITE_` and `EXPO_PUBLIC_` variables become client-visible; encrypted source does not keep a bundled value secret. No model credentials are needed for the present browser simulator. The site now packages a Worker gateway. Hosted deployments use Sites runtime secrets; the current Worker does not decrypt dotenvx files itself.

## Verification

`npm run env:test` encrypts a non-secret fixture for each environment in a temporary directory, verifies decryption in a child process, and verifies missing-key failure. It prints no secrets and deletes both fixtures and generated keys. No ciphertext or credentials have been added to this repository merely to demonstrate configuration.

Reference: https://dotenvx.com/docs/quickstart/
