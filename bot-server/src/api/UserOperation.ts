import { defaultAbiCoder } from "@ethersproject/abi";
import { Contract } from "ethers";
import { arrayify, keccak256 } from "ethers/lib/utils";
import * as typ from "./SolidityTypes";

export interface UserOperation {
  sender: typ.address;
  nonce: typ.uint256;
  initCode: typ.bytes;
  callData: typ.bytes;
  callGasLimit: typ.uint256;
  verificationGasLimit: typ.uint256;
  preVerificationGas: typ.uint256;
  maxFeePerGas: typ.uint256;
  maxPriorityFeePerGas: typ.uint256;
  paymasterAndData: typ.bytes;
  signature: typ.bytes;
}

export function signatureMessage(message: string): string {
  const msg = Buffer.concat([
    Buffer.from("\x19Ethereum Signed Message:\n32", "ascii"),
    Buffer.from(arrayify(message)),
  ]);
  return keccak256(msg);
}

export function getUserOpHash(
  op: UserOperation,
  entryPoint: Contract,
  chainId: number
): string {
  const userOpHash = keccak256(packUserOp(op));
  const enc = defaultAbiCoder.encode(
    ["bytes32", "address", "uint256"],
    [userOpHash, entryPoint.address.toLowerCase(), chainId]
  );
  return keccak256(enc);
}

function packUserOp(op: UserOperation): string {
  console.log("packUserOp", op);
  return defaultAbiCoder.encode(
    [
      "address",
      "uint256",
      "bytes32",
      "bytes32",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "bytes32",
    ],
    [
      op.sender,
      op.nonce,
      keccak256(op.initCode),
      keccak256(op.callData),
      op.callGasLimit,
      op.verificationGasLimit,
      op.preVerificationGas,
      op.maxFeePerGas,
      op.maxPriorityFeePerGas,
      keccak256(op.paymasterAndData),
    ]
  );
}
