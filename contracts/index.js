import fs from "fs";
import path from "path";
const __dirname = path.resolve();

export const getMintingContract = () => {
  const contract = fs.readFileSync(path.join(__dirname, "contracts", "minting.hl"), "utf8");
  return contract;
};

export const getRefHolderContract = () => {
  const contract = fs.readFileSync(path.join(__dirname, "contracts", "holder.hl"), "utf8");
  return contract;
};
