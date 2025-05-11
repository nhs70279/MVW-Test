const { ethers } = require("hardhat");

async function main() {
  const ENTRYPOINT = process.env.ENTRYPOINT_ADDRESS || "0xEntryPointAddress";
  const PAYMASTER = process.env.PAYMASTER_ADDRESS || "0xPaymasterAddress";
  const STAKE_AMOUNT = process.env.STAKE_AMOUNT || ethers.utils.parseEther("1");
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || ethers.utils.parseEther("0.5");

  const entryPointAbi = [
    "function addStake(uint32 unstakeDelaySec) external payable",
    "function depositTo(address) external payable"
  ];
  const [deployer] = await ethers.getSigners();
  const entryPoint = new ethers.Contract(ENTRYPOINT, entryPointAbi, deployer);

  // ステーク
  console.log("Staking to EntryPoint...");
  await (await entryPoint.addStake(604800, { value: STAKE_AMOUNT })).wait(); // 1 week delay
  console.log("Stake complete");

  // デポジット
  console.log("Depositing to EntryPoint for Paymaster...");
  await (await entryPoint.depositTo(PAYMASTER, { value: DEPOSIT_AMOUNT })).wait();
  console.log("Deposit complete");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 