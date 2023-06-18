import {
  CreateAliasCommand,
  CreateKeyCommand,
  CustomerMasterKeySpec,
  DescribeKeyCommand,
  KMSClient,
  KeyMetadata,
  KeyUsageType,
  NotFoundException,
} from "@aws-sdk/client-kms";

const kmsClient = new KMSClient({
  region: "ap-northeast-1",
});

export function getKeyAlias(userId: string): string {
  return `alias/uid-${userId}`;
}
export async function createKmsKey(
  userId: string
): Promise<KeyMetadata | undefined> {
  try {
    // すでにあるならそれを返す
    const result = await getKey(userId);
    return result.KeyMetadata;
  } catch (e: any) {
    if (e instanceof NotFoundException) {
      //  ないなら作成する
      const newKey = await kmsClient.send(
        new CreateKeyCommand({
          CustomerMasterKeySpec: CustomerMasterKeySpec.ECC_SECG_P256K1,
          Tags: [{ TagKey: "user-id", TagValue: userId }],
          KeyUsage: KeyUsageType.SIGN_VERIFY,
        })
      );
      console.log("newKey", newKey);

      const result = await kmsClient.send(
        new CreateAliasCommand({
          TargetKeyId: newKey.KeyMetadata?.KeyId,
          AliasName: `${getKeyAlias(userId)}`,
        })
      );
      console.log("result", result);
      return newKey.KeyMetadata;
    }
  }
}

export async function getKey(userId: string) {
  return await kmsClient.send(
    new DescribeKeyCommand({
      KeyId: `${getKeyAlias(userId)}`,
    })
  );
}
