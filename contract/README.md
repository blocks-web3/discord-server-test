# AA Multisig Wallet Sample

this is sample.

## initialize

```shell
node -v
v18.14.2
```

```shell
npm install -g pnpm
```

## commands

exec test

```shell
pnpm test
```

compile

```shell
pnpm compile
```

deploy(local)

```shell
pnpm deploy:dev
```

deploy(mumbai)

```shell

echo "# this account should have some matic at mumbai
MNEMONIC=XXXXX
# APIKEY for mumbai
ALCHEMY_APIKEY=YYYY
"> .env

pnpm deploy:mumbai
```
