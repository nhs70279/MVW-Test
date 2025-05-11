const { ethers } = require("hardhat");

async function main() {
  // 必要に応じて環境変数や引数でアドレスを指定
  const ENTRYPOINT = process.env.ENTRYPOINT_ADDRESS || "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
  const WLD_TOKEN = process.env.WLD_TOKEN_ADDRESS || "0x2cfc85d8e48f8eab294be644d9e25c3030863003";

  const WLDPaymaster = await ethers.getContractFactory("WLDPaymaster");
  const paymaster = await WLDPaymaster.deploy(ENTRYPOINT, WLD_TOKEN);
  await paymaster.deployed();

  console.log("WLDPaymaster deployed to:", paymaster.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 