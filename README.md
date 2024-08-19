# Welcome to the xiv-craftsmanship IaC project

A repository for IaC development using AWS CDK and TypeScript.

## Useful commands

### Start execution environment

```sh
devbox shell
```

### Show infrastructure differences

```sh
npm run cdk:{environment} diff
```

### Perform infrastructure deployment all

```sh
npm run cdk:{environment} deploy
```

### Perform infrastructure deployment stack

```sh
npm run cdk:{environment} deploy {stack name}
```

## snippet

### Service

```sh
npm run cdk:develop deploy XivCraftsmanshipStack
```
