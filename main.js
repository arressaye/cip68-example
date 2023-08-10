await import("dotenv").then((module) => module.config());
import * as helios from "@hyperionbt/helios";
import { Lucid, Blockfrost, toUnit, Data } from "lucid-cardano";
import { getMintingContract, getRefHolderContract } from "./contracts/index.js";
import { PlutusData } from "@emurgo/cardano-serialization-lib-nodejs";

const lucid = await Lucid.new(new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", process.env.BLOCKFROST_API_KEY), "Preprod");

const mintingContract = getMintingContract();
const mintingProgram = helios.Program.new(mintingContract);
const mintingProgramCompiled = mintingProgram.compile(true);
const mintingPolicyId = mintingProgramCompiled.mintingPolicyHash.hex;
const mintingScript = JSON.parse(mintingProgramCompiled.serialize()).cborHex;

const refHolderContract = getRefHolderContract();
const refHolderProgram = helios.Program.new(refHolderContract);
const refHolderProgramCompiled = refHolderProgram.compile(true);
const refHolderScript = JSON.parse(refHolderProgramCompiled.serialize()).cborHex;
const refHolderAddress = helios.Address.fromHashes(refHolderProgramCompiled.validatorHash, null, true).toBech32();

console.log("NFT policy ID:", mintingPolicyId);
console.log("Reference token holding address:", refHolderAddress);

function createDatum(name, image) {
  const metadata = [
    {
      name,
      image,
    },
    1,
  ];
  return PlutusData.from_json(JSON.stringify(metadata), 0).to_hex();
}

async function mint(name, image, recipient) {
  const userTokenName = toUnit(mintingPolicyId, Buffer.from(name, "utf8").toString("hex"), 222);
  const refTokenName = toUnit(mintingPolicyId, Buffer.from(name, "utf8").toString("hex"), 100);
  lucid.selectWalletFrom({ address: recipient });
  const tx = await lucid
    .newTx()
    .validTo(Date.now() + 15 * 60 * 1000) //set ttl
    .mintAssets(
      //mint both the user and reference tokens
      {
        [userTokenName]: 1n,
        [refTokenName]: 1n,
      },
      Data.void()
    )
    .payToAddress(recipient, {
      //send the minted user token to the user
      [userTokenName]: 1n,
    })
    .payToContract(
      //lock the minted reference token in the holding contract
      refHolderAddress,
      {
        asHash: "d879" + Data.to(Data.from(createDatum(name, image))),
      },
      {
        [refTokenName]: 1n,
      }
    )
    .addSigner(recipient) //minting script requires a specific pkh
    .attachMintingPolicy({
      //add minting script to tx
      script: mintingScript,
      type: "PlutusV2",
    })
    .complete();

  if (tx) return tx.toString();
}

console.log(
  await mint("TestNFT2", "ipfs://QmWzejTXEU8MqhHGVV5e1Uirv56hZVVNknBnb9pbCu9xkd", "addr_test1qrnwz9ssg9kzwjwf7pqxm0ufnlq3jwp5ashnfljvxkurxrk0ewhlaffhphx3msjxtqef967xc4mswkpedcaezyp3mv7qn5ul00")
);
